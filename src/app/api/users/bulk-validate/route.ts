import { NextRequest, NextResponse } from 'next/server';
import { getTypedServerSession } from '@/lib/auth/session-utils';
import { BulkOperationsService } from '@/lib/user-management/bulk-operations';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const bulkValidateSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    role: z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT']),
    department: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
    studentId: z.string().optional(),
    year: z.number().min(1).max(10).optional(),
    major: z.string().optional(),
    isActive: z.boolean().optional(),
  })),
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
    const { users } = bulkValidateSchema.parse(body);

    const bulkService = new BulkOperationsService(prisma);
    const validation = await bulkService.validateImportData(users);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating import data:', error);
    
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
      { error: 'Failed to validate import data' },
      { status: 500 }
    );
  }
}
