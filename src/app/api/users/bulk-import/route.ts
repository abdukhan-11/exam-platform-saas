import { NextRequest, NextResponse } from 'next/server';
import { getTypedServerSession } from '@/lib/auth/session-utils';
import { BulkOperationsService } from '@/lib/user-management/bulk-operations';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const bulkImportSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    role: z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT']),
    department: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
    studentId: z.string().optional(),
    year: z.number().min(1).max(10).optional(),
    major: z.string().optional(),
    isActive: z.boolean().optional(),
  })),
  collegeId: z.string(),
  options: z.object({
    sendWelcomeEmails: z.boolean().optional(),
    defaultPassword: z.string().optional(),
    skipExisting: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.BULK_IMPORT_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { users, collegeId, options } = bulkImportSchema.parse(body);

    // Check college access
    if (!PermissionService.canAccessCollege(
      session.user.role,
      session.user.collegeId ?? '',
      collegeId
    )) {
      return NextResponse.json({ error: 'Cannot import users to this college' }, { status: 403 });
    }

    const bulkService = new BulkOperationsService(prisma);
    const result = await bulkService.importUsers(users, collegeId, session.user.id, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing users:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.BULK_IMPORT_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bulkService = new BulkOperationsService(prisma);
    const template = await bulkService.getImportTemplate();

    return new Response(template.data, {
      headers: {
        'Content-Type': template.mimeType,
        'Content-Disposition': `attachment; filename="${template.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error getting import template:', error);
    
    return NextResponse.json(
      { error: 'Failed to get import template' },
      { status: 500 }
    );
  }
}