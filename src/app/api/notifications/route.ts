import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';

// GET: list current user's in-app notifications
// Query params: limit (default 20), before (iso string) for pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
    const before = url.searchParams.get('before');

    const where: any = { userId: currentUser.id, channel: 'IN_APP' };
    if (before) {
      const d = new Date(before);
      if (!isNaN(d.getTime())) {
        where.createdAt = { lt: d };
      }
    }

    const items = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        status: true,
        createdAt: true,
        readAt: true,
        metadata: true,
      },
    });

    const unreadCount = await db.notification.count({ where: { userId: currentUser.id, channel: 'IN_APP', readAt: null } });

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

// PATCH: mark notifications as read
// Body: { ids?: string[]; all?: boolean }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    const markAll: boolean = Boolean(body?.all);

    if (!markAll && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: 'Specify ids or set all=true' }, { status: 400 });
    }

    if (markAll) {
      await db.notification.updateMany({
        where: { userId: currentUser.id, channel: 'IN_APP', readAt: null },
        data: { readAt: new Date(), status: 'READ' },
      });
    } else if (ids) {
      await db.notification.updateMany({
        where: { id: { in: ids }, userId: currentUser.id, channel: 'IN_APP' },
        data: { readAt: new Date(), status: 'READ' },
      });
    }

    const unreadCount = await db.notification.count({ where: { userId: currentUser.id, channel: 'IN_APP', readAt: null } });
    return NextResponse.json({ ok: true, unreadCount });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}


