import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { action, collegeIds } = await request.json();

    if (!action || !collegeIds || !Array.isArray(collegeIds) || collegeIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    let result;
    let message;

    switch (action) {
      case 'activate':
        result = await prisma.college.updateMany({
          where: { id: { in: collegeIds } },
          data: { isActive: true }
        });
        message = `Activated ${result.count} colleges`;
        break;

      case 'deactivate':
        result = await prisma.college.updateMany({
          where: { id: { in: collegeIds } },
          data: { isActive: false }
        });
        message = `Deactivated ${result.count} colleges`;
        break;

      case 'delete':
        // For deletion, we need to handle related data carefully
        // First, check if any colleges have active users or exams
        const collegesWithData = await prisma.college.findMany({
          where: { id: { in: collegeIds } },
          include: {
            users: { take: 1 },
            exams: { take: 1 }
          }
        });

        const collegesWithActiveData = collegesWithData.filter(
          (college: any) => college.users.length > 0 || college.exams.length > 0
        );

        if (collegesWithActiveData.length > 0) {
          return NextResponse.json({
            error: 'Cannot delete colleges with active users or exams',
            colleges: collegesWithActiveData.map((c: any) => ({ id: c.id, name: c.name }))
          }, { status: 400 });
        }

        result = await prisma.college.deleteMany({
          where: { id: { in: collegeIds } }
        });
        message = `Deleted ${result.count} colleges`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message,
      count: result.count
    });

  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
