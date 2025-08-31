import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/monitoring/error-tracking';

const BodySchema = z.object({
  sessionId: z.string().min(1),
  timestamp: z.number().int().optional(),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.any(),
    timestamp: z.number().int().optional()
  })).min(1)
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { id } = await params;
    const rl = consumeRateLimit({ ip, identifier: id, category: 'examOps' });
    if (!rl.allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.studentExamAttempt.upsert({
      where: { userId_examId: { userId: currentUser.id, examId: id } },
      update: {
        activityLog: '[]'
      },
      create: {
        userId: currentUser.id,
        examId: id,
        collegeId: exam.collegeId,
        startedAt: new Date()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureError(error, { route: 'POST /api/exams/[id]/answers' });
    return NextResponse.json({ error: 'Failed to sync answers' }, { status: 500 });
  }
}
