import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/monitoring/error-tracking';

const SubmitSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  submittedAt: z.string().optional(),
  isAutoSubmit: z.boolean().optional(),
  emergencyReason: z.string().optional(),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.any(),
    timestamp: z.number().int().optional()
  })).min(1)
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = consumeRateLimit({ ip, identifier: params.id, category: 'examOps' });
    if (!rl.allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const body = await req.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const exam = await db.exam.findUnique({ where: { id: params.id } });
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const questions = await db.question.findMany({ where: { examId: params.id } });

    let score = 0;
    let totalMarks = 0;
    for (const q of questions) {
      const ans = parsed.data.answers.find(a => a.questionId === q.id);
      totalMarks += q.marks || 0;
      if (!ans) continue;
      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        if (String(ans.answer) === String(q.correctAnswer)) score += q.marks || 0;
      }
    }

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    // Calculate grade using the grading system
    const { resolveGradeByPercentage } = await import('@/lib/exams/grading');
    const gradeResult = await resolveGradeByPercentage(percentage, exam.collegeId);

    await db.examResult.upsert({
      where: { userId_examId: { userId: currentUser.id, examId: params.id } },
      update: {
        score,
        totalMarks,
        percentage,
        grade: gradeResult.grade,
        isCompleted: true,
        endTime: new Date(),
      },
      create: {
        userId: currentUser.id,
        examId: params.id,
        score,
        totalMarks,
        percentage,
        grade: gradeResult.grade,
        isCompleted: true,
        startTime: new Date(),
        endTime: new Date(),
      }
    });

    // Update or create student exam attempt
    const attempt = await db.studentExamAttempt.upsert({
      where: { userId_examId: { userId: currentUser.id, examId: params.id } },
      update: {
        endedAt: new Date(),
        isCompleted: true,
        score,
        totalMarks
      },
      create: {
        userId: currentUser.id,
        examId: params.id,
        collegeId: exam.collegeId,
        startedAt: new Date(),
        endedAt: new Date(),
        isCompleted: true,
        score,
        totalMarks
      }
    });

    // Store individual student answers for detailed analysis
    const answerPromises = parsed.data.answers.map(async (answer) => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      const isCorrect = question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE' 
        ? String(answer.answer) === String(question.correctAnswer)
        : false; // For essay/short answer, manual grading needed

      const marksAwarded = isCorrect ? question.marks : 0;

      await db.studentAnswer.upsert({
        where: { 
          attemptId_questionId: { 
            attemptId: attempt.id, 
            questionId: answer.questionId 
          } 
        },
        update: {
          selectedOptionId: typeof answer.answer === 'string' ? answer.answer : null,
          answerText: typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer),
          isCorrect,
          marksAwarded,
          answeredAt: new Date()
        },
        create: {
          attemptId: attempt.id,
          questionId: answer.questionId,
          selectedOptionId: typeof answer.answer === 'string' ? answer.answer : null,
          answerText: typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer),
          isCorrect,
          marksAwarded,
          timeSpent: answer.timestamp || 0,
          answeredAt: new Date(),
          collegeId: exam.collegeId
        }
      });
    });

    await Promise.all(answerPromises);

    return NextResponse.json({ 
      ok: true, 
      score, 
      totalMarks, 
      percentage, 
      grade: gradeResult.grade,
      attemptId: attempt.id 
    });
  } catch (error) {
    captureError(error, { route: 'POST /api/exams/[id]/submit' });
    return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 });
  }
}
