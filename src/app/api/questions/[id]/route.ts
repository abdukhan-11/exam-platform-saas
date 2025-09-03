import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (!PermissionService.hasPermission(currentUser.role, Permission.DELETE_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user has access to this question
    const question = await db.question.findUnique({
      where: { id },
      include: {
        exam: {
          select: { collegeId: true, isActive: true }
        }
      }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && question.exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!question.exam.isActive) {
      return NextResponse.json({ error: 'Cannot delete questions from inactive exam' }, { status: 400 });
    }

    // Delete question (this will cascade delete options due to foreign key constraints)
    await db.question.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Question deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
