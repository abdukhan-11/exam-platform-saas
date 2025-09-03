import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get exam attempt
    const attempt = await db.studentExamAttempt.findUnique({
      where: {
        userId_examId: {
          userId: currentUser.id,
          examId: id
        }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: 'No attempt found' }, { status: 404 });
    }

    return NextResponse.json({
      id: attempt.id,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt,
      isCompleted: attempt.isCompleted,
      score: attempt.score,
      totalMarks: attempt.totalMarks
    });

  } catch (error: any) {
    console.error('Error fetching exam attempt:', error);
    return NextResponse.json({ error: 'Failed to fetch exam attempt' }, { status: 500 });
  }
}
