import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { PermissionService, Permission } from '@/lib/user-management/permissions'
import { buildExamAnalyticsSummary } from '@/lib/exams/analytics'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUser = session.user as any

    const exam = await db.exam.findUnique({ where: { id: params.id } })
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Only teachers/admins with exam read permission can view analytics
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM, Permission.READ_ANALYTICS])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Enforce college scope (non-super admins)
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [results, attempts, answers, questions] = await Promise.all([
      db.examResult.findMany({
        where: { examId: exam.id },
        select: { score: true, totalMarks: true, percentage: true, startTime: true, endTime: true, isCompleted: true },
      }),
      db.studentExamAttempt.findMany({
        where: { examId: exam.id },
        select: { isCompleted: true },
      }),
      db.studentAnswer.findMany({
        where: { attempt: { examId: exam.id } },
        select: { questionId: true, isCorrect: true },
      }),
      db.question.findMany({
        where: { examId: exam.id },
        select: { id: true, difficulty: true },
      }),
    ])

    const summary = buildExamAnalyticsSummary({ exam, results, attempts, answers, questions })
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error computing exam analytics:', error)
    return NextResponse.json({ error: 'Failed to compute exam analytics' }, { status: 500 })
  }
}


