import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AppRole, UserSession } from '@/types/auth';
import { hasAnyRole } from '@/lib/auth/utils';
import { db } from '@/lib/db';

function toCSV(rows: any[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => (
    v == null ? '' : String(v).includes(',') || String(v).includes('"') || String(v).includes('\n')
      ? '"' + String(v).replace(/"/g, '""') + '"'
      : String(v)
  );
  const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => escape(r[h])).join(',')));
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    if (!session?.user?.role || !hasAnyRole(session.user.role, [AppRole.SUPER_ADMIN])) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const format = (params.get('format') || 'csv').toLowerCase();
    const search = params.get('search') || '';
    const tier = params.get('tier') || '';
    const status = params.get('status') || '';

    const where: any = {};
    if (search.trim()) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { website: { contains: search } }
      ];
    }
    if (tier && tier !== 'all') where.subscriptionStatus = tier;
    if (status && status !== 'all') where.isActive = status === 'active';

    const colleges = await db.college.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        code: true,
        email: true,
        phone: true,
        website: true,
        isActive: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const rows = colleges.map(c => ({
      id: c.id,
      name: c.name,
      username: (c as any).username,
      code: (c as any).code,
      email: c.email,
      phone: c.phone,
      website: c.website,
      isActive: c.isActive,
      subscriptionStatus: c.subscriptionStatus,
      userCount: (c as any)._count?.users ?? 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Only CSV implemented for now (Excel could be added later)
    if (format !== 'csv') {
      return NextResponse.json({ message: 'Only CSV export is supported currently' }, { status: 400 });
    }

    const csv = toCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="colleges-export.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to export colleges' }, { status: 500 });
  }
}