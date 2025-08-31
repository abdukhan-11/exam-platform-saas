import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AppRole, UserSession } from '@/types/auth';
import { hasAnyRole } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;
    const collegeIds = Array.isArray(body.collegeIds) ? body.collegeIds as string[] : [];

    if (!action || collegeIds.length === 0) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json({ message: 'Unsupported action' }, { status: 400 });
    }

    if (action === 'delete') {
      // Prevent deleting colleges with dependent users
      const counts = await db.user.groupBy({
        by: ['collegeId'],
        where: { collegeId: { in: collegeIds } },
        _count: { _all: true },
      });
      const blocked = new Set(counts.filter(c => c._count._all > 0).map(c => c.collegeId as string));
      const allowedToDelete = collegeIds.filter(id => !blocked.has(id));

      if (allowedToDelete.length > 0) {
        await db.college.deleteMany({ where: { id: { in: allowedToDelete } } });
      }

      const blockedCount = collegeIds.length - allowedToDelete.length;
      if (blockedCount > 0) {
        return NextResponse.json({
          message: `Deleted ${allowedToDelete.length} colleges. ${blockedCount} could not be deleted due to dependencies.`,
          deleted: allowedToDelete.length,
          blocked: blockedCount,
        }, { status: 207 });
      }

      return NextResponse.json({ message: `Deleted ${allowedToDelete.length} colleges.` });
    }

    // Activate / Deactivate
    const isActive = action === 'activate';
    await db.college.updateMany({ where: { id: { in: collegeIds } }, data: { isActive } });
    return NextResponse.json({ message: `Updated ${collegeIds.length} colleges.` });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to perform bulk action' }, { status: 500 });
  }
}