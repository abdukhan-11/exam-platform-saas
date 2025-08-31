import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { BulkOperationsService } from '@/lib/user-management/bulk-operations';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const bulkExportSchema = z.object({
  collegeId: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT']).optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  includeInactive: z.boolean().optional(),
  format: z.enum(['csv', 'xlsx', 'json']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.VIEW_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const options = bulkExportSchema.parse(body);

    // Check college access (only if user has a college ID)
    if (options.collegeId && session.user.collegeId &&
        !PermissionService.canAccessCollege(
          session.user.role,
          session.user.collegeId,
          options.collegeId
        )) {
      return NextResponse.json({ error: 'Cannot export users from this college' }, { status: 403 });
    }

    // If no collegeId specified and user is not SUPER_ADMIN, use their college
    if (!options.collegeId && session.user.role !== 'SUPER_ADMIN') {
      options.collegeId = session.user.collegeId || undefined;
    }

    const bulkService = new BulkOperationsService(prisma);
    const result = await bulkService.exportUsers(options, session.user.id);

    // Return the export result
    return new Response(result.data as any, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    
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
      { error: 'Failed to export users' },
      { status: 500 }
    );
  }
}
