import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { resolveGradeByPercentage } from '@/lib/exams/grading'

export async function GET(
  _req: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = session.user as any
    if (currentUser.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify the result belongs to the current user
    const attempt = await db.studentExamAttempt.findUnique({
      where: { userId_examId: { userId: currentUser.id, examId: params.examId } },
      select: { id: true, examId: true, score: true, totalMarks: true, isCompleted: true },
    })
    if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const answers = await db.studentAnswer.findMany({
      where: { attemptId: attempt.id },
      select: {
        questionId: true,
        isCorrect: true,
        marksAwarded: true,
        timeSpent: true,
        question: { select: { text: true, difficulty: true, marks: true } },
      },
      orderBy: { answeredAt: 'asc' },
    })

    const details = answers.map((a) => ({
      questionId: a.questionId,
      questionText: a.question.text,
      difficulty: a.question.difficulty,
      marks: a.question.marks,
      isCorrect: a.isCorrect,
      marksAwarded: a.marksAwarded,
      timeSpentSec: a.timeSpent ?? null,
    }))

    // Compute grade on the fly (works even if grade table not migrated)
    const exam = await db.exam.findUnique({ where: { id: params.examId }, select: { collegeId: true } })
    const percentage = attempt.totalMarks ? (attempt.score / attempt.totalMarks) * 100 : 0
    const gradeRes = await resolveGradeByPercentage(percentage, exam?.collegeId)

    return NextResponse.json({ attempt: { ...attempt, percentage, grade: gradeRes.grade }, details })
  } catch (error) {
    console.error('Personal result details error:', error)
    return NextResponse.json({ error: 'Failed to load result details' }, { status: 500 })
  }
}


