import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { hasAnyRole } from '@/lib/auth/utils';
import { AppRole, UserSession } from '@/types/auth';
import { db } from '@/lib/db';
import { apiResponse } from '@/lib/api-response';
import { validateData, collegeValidationRules } from '@/lib/validation';
import { errorLogger } from '@/lib/error-logger';

// GET /api/colleges/[id] - Get a specific college by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    // Check if user is authenticated and has super admin role
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { message: 'Invalid college ID' },
        { status: 400 }
      );
    }

    // Find the college
    const college = await db.college.findUnique({
      where: { id },
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
      },
    });

    if (!college) {
      return NextResponse.json(
        { message: 'College not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ college });

  } catch (error) {
    console.error('Error fetching college:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Failed to fetch college: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'An unexpected error occurred while fetching the college' },
      { status: 500 }
    );
  }
}

// PUT /api/colleges/[id] - Update a college
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    // Check if user is authenticated and has super admin role
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { message: 'Invalid college ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { message: 'College name is required' },
        { status: 400 }
      );
    }

    // Validate name length
    if (body.name.trim().length < 2) {
      return NextResponse.json(
        { message: 'College name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (body.name.trim().length > 100) {
      return NextResponse.json(
        { message: 'College name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Validate address length if provided
    if (body.address && body.address.trim().length > 200) {
      return NextResponse.json(
        { message: 'Address must be less than 200 characters' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (body.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(body.phone.replace(/[\s\-\(\)]/g, ''))) {
        return NextResponse.json(
          { message: 'Please enter a valid phone number' },
          { status: 400 }
        );
      }
    }

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { message: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
    }

    // Validate website URL if provided
    if (body.website) {
      try {
        new URL(body.website);
      } catch {
        return NextResponse.json(
          { message: 'Please enter a valid URL (e.g., https://example.com)' },
          { status: 400 }
        );
      }
    }

    // Check if college exists
    const existingCollege = await db.college.findUnique({
      where: { id },
    });

    if (!existingCollege) {
      return NextResponse.json(
        { message: 'College not found' },
        { status: 404 }
      );
    }

    // Check if college name already exists (case-insensitive, excluding current college)
    if (body.name.trim().toLowerCase() !== existingCollege.name.toLowerCase()) {
      const duplicateCollege = await db.college.findFirst({
        where: {
          AND: [
            {
              OR: [
                { name: body.name.trim() },
                { name: body.name.trim().toLowerCase() },
                { name: body.name.trim().toUpperCase() }
              ]
            },
            { id: { not: id } }
          ]
        }
      });

      if (duplicateCollege) {
        return NextResponse.json(
          { message: 'A college with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the college
    const updatedCollege = await db.college.update({
      where: { id },
      data: {
        name: body.name.trim(),
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        website: body.website?.trim() || null,
        isActive: body.isActive !== undefined ? body.isActive : existingCollege.isActive,
        updatedAt: new Date(),
      },
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
      },
    });

    return NextResponse.json({
      message: 'College updated successfully',
      college: updatedCollege,
    });

  } catch (error) {
    console.error('Error updating college:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Failed to update college: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'An unexpected error occurred while updating the college' },
      { status: 500 }
    );
  }
}

// DELETE /api/colleges/[id] - Delete a college
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    // Check if user is authenticated and has super admin role
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { message: 'Invalid college ID' },
        { status: 400 }
      );
    }

    // Check if college exists
    const existingCollege = await db.college.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingCollege) {
      return NextResponse.json(
        { message: 'College not found' },
        { status: 404 }
      );
    }

    // Check if college has any dependencies (e.g., students, teachers, etc.)
    try {
      // Check for associated users
      const userCount = await db.user.count({
        where: { collegeId: id },
      });

      if (userCount > 0) {
        return NextResponse.json(
          { 
            message: 'Cannot delete college',
            details: `This college has ${userCount} user(s) associated with it. Please reassign or remove these users before deleting the college.`,
            dependencyType: 'users',
            dependencyCount: userCount
          },
          { status: 409 }
        );
      }

      // You can add more dependency checks here as your schema grows
      // Example: subjects, exams, etc.
      
    } catch (depError) {
      console.error('Error checking dependencies:', depError);
      // Continue with deletion if dependency check fails (optional - you might want to fail instead)
    }

    // Delete the college
    await db.college.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'College deleted successfully',
      deletedCollege: {
        id: existingCollege.id,
        name: existingCollege.name,
      },
    });

  } catch (error) {
    console.error('Error deleting college:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Failed to delete college: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'An unexpected error occurred while deleting the college' },
      { status: 500 }
    );
  }
}
