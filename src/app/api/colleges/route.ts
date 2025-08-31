import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { hasAnyRole } from '@/lib/auth/utils';
import { AppRole, UserSession } from '@/types/auth';
import { db } from '@/lib/db';
import { apiResponse } from '@/lib/api-response';
import { validateData, collegeValidationRules } from '@/lib/validation';
import { errorLogger } from '@/lib/error-logger';

// GET /api/colleges - Get all colleges with pagination, search, and sorting
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    // Check if user is authenticated and has super admin role
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get query parameters for pagination, search, and sorting
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const tier = searchParams.get('tier') || '';
    const status = searchParams.get('status') || '';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return apiResponse.validationError('Invalid pagination parameters', [
        'Page must be greater than 0',
        'Limit must be between 1 and 100'
      ], request);
    }

    // Validate sort parameters
    const allowedSortFields = ['name', 'address', 'email', 'phone', 'website', 'createdAt', 'updatedAt'];
    const allowedSortOrders = ['asc', 'desc'];
    
    if (!allowedSortFields.includes(sortBy)) {
      return apiResponse.validationError('Invalid sort field', [
        `Sort field must be one of: ${allowedSortFields.join(', ')}`
      ], request);
    }
    
    if (!allowedSortOrders.includes(sortOrder)) {
      return apiResponse.validationError('Invalid sort order', [
        'Sort order must be either "asc" or "desc"'
      ], request);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause: any = {};
    
    if (search.trim()) {
      whereClause.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { website: { contains: search } }
      ];
    }
    // Optional filters: tier => subscriptionStatus, status => isActive
    if (tier && tier !== 'all') {
      whereClause.subscriptionStatus = tier;
    }
    if (status && status !== 'all') {
      whereClause.isActive = status === 'active';
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count for pagination
    const total = await db.college.count({ where: whereClause });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    // Get colleges with pagination, search, and sorting
    const colleges = await db.college.findMany({
      where: whereClause,
      orderBy: orderBy,
      skip: skip,
      take: limit,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        isActive: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true } },
      },
    });

    // Log successful operation
    errorLogger.logInfo(
      `Colleges fetched successfully`,
      { 
        total, 
        page, 
        limit, 
        search: search || 'none',
        sortBy,
        sortOrder 
      },
      request
    );

    // Map userCount for UI expectations
    const result = colleges.map((c) => ({
      ...c,
      userCount: (c as any)._count?.users ?? 0,
    }));

    return apiResponse.withPagination(
      'Colleges fetched successfully',
      result,
      { total, page, limit, pages: totalPages },
      {
        endpoint: request.nextUrl?.pathname,
        method: request.method,
        requestId: request.headers.get('x-request-id') || undefined,
      }
    );

  } catch (error) {
    errorLogger.logError('Failed to fetch colleges', error, request);
    return apiResponse.error('Failed to fetch colleges', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}

// POST /api/colleges - Create a new college
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    // Check if user is authenticated and has super admin role
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input data using the new validation system
    const validation = validateData(body, collegeValidationRules);
    if (!validation.isValid) {
      return apiResponse.validationError(
        'College data validation failed',
        validation.errors,
        request
      );
    }

    // Check for duplicate college name (case-insensitive for SQLite)
    const existingCollege = await db.college.findFirst({
      where: {
        OR: [
          { name: body.name.trim() },
          { name: body.name.trim().toLowerCase() },
          { name: body.name.trim().toUpperCase() }
        ]
      },
    });

    if (existingCollege) {
      return apiResponse.conflict(
        'A college with this name already exists',
        { existingCollegeId: existingCollege.id },
        request
      );
    }

    // Create the college
    const username = body.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const collegeCode = username.toUpperCase();

    const college = await db.college.create({
      data: {
        name: body.name.trim(),
        username: username,
        code: collegeCode,
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        website: body.website?.trim() || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log successful creation
    errorLogger.logInfo(
      'College created successfully',
      { collegeId: college.id, collegeName: college.name },
      request
    );

    return apiResponse.created('College created successfully', college, {
      endpoint: request.nextUrl?.pathname,
      method: request.method,
      requestId: request.headers.get('x-request-id') || undefined,
    });

  } catch (error) {
    errorLogger.logError('Failed to create college', error, request);
    return apiResponse.error('Failed to create college', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}
