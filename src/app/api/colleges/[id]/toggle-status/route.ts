import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AppRole, UserSession } from '@/types/auth';
import { hasAnyRole } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ message: 'Invalid college ID' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined;
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ message: 'isActive boolean required' }, { status: 400 });
    }

    const updated = await db.college.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true }
    });

    return NextResponse.json({ message: 'Status updated', college: updated });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update status' }, { status: 500 });
  }
}
