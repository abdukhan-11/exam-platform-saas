import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get email statistics from EmailLog table
    const [
      total,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      pending
    ] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'SENT' } }),
      prisma.emailLog.count({ where: { status: 'DELIVERED' } }),
      prisma.emailLog.count({ where: { status: 'OPENED' } }),
      prisma.emailLog.count({ where: { status: 'CLICKED' } }),
      prisma.emailLog.count({ where: { status: 'BOUNCED' } }),
      prisma.emailLog.count({ where: { status: 'FAILED' } }),
      prisma.emailLog.count({ where: { status: 'PENDING' } })
    ]);

    const stats = {
      total,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      pending
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
