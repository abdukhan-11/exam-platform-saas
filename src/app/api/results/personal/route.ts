import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const results = await db.examResult.findMany({
      where: { userId: currentUser.id },
      orderBy: { endTime: 'desc' },
      select: {
        id: true,
        examId: true,
        score: true,
        totalMarks: true,
        percentage: true,
        startTime: true,
        endTime: true,
        isCompleted: true,
        exam: {
          select: {
            title: true,
            subjectId: true,
            classId: true,
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })

    const examIds = Array.from(new Set(results.map((r) => r.examId)))
    const classAverages = new Map<string, number>()
    if (examIds.length) {
      const avgs = await db.examResult.groupBy({
        by: ['examId'],
        where: { examId: { in: examIds } },
        _avg: { percentage: true },
      })
      for (const a of avgs) {
        classAverages.set(a.examId, a._avg.percentage ?? 0)
      }
    }

    const items = results.map((r) => {
      const timeTakenSec = r.endTime
        ? Math.max(0, (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 1000)
        : null
      return {
        id: r.id,
        examId: r.examId,
        examTitle: r.exam.title,
        subjectId: r.exam.subjectId,
        subjectName: r.exam.subject?.name ?? r.exam.subjectId,
        subjectCode: r.exam.subject?.code ?? null,
        date: r.endTime ?? r.startTime,
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        timeTakenSec,
        isCompleted: r.isCompleted,
        classAveragePercentage: classAverages.get(r.examId) ?? null,
      }
    })

    const attempts = await db.studentExamAttempt.findMany({
      where: { userId: currentUser.id },
      select: { id: true, exam: { select: { subjectId: true, subject: { select: { name: true, code: true } } } } },
    })
    const attemptIds = attempts.map((a) => a.id)
    let subjectAnalytics: Array<{
      subjectId: string
      subjectName: string
      correct: number
      incorrect: number
      accuracy: number
    }> = []
    if (attemptIds.length) {
      const answers = await db.studentAnswer.findMany({
        where: { attemptId: { in: attemptIds } },
        select: {
          isCorrect: true,
          attempt: { select: { exam: { select: { subjectId: true, subject: { select: { name: true } } } } } },
        },
      })
      const bySubject = new Map<string, { name: string; correct: number; total: number }>()
      for (const ans of answers) {
        const sid = ans.attempt.exam.subjectId
        const sname = ans.attempt.exam.subject?.name ?? sid
        const prev = bySubject.get(sid) ?? { name: sname, correct: 0, total: 0 }
        prev.total += 1
        if (ans.isCorrect) prev.correct += 1
        bySubject.set(sid, prev)
      }
      subjectAnalytics = Array.from(bySubject.entries()).map(([subjectId, v]) => ({
        subjectId,
        subjectName: v.name,
        correct: v.correct,
        incorrect: Math.max(0, v.total - v.correct),
        accuracy: v.total ? v.correct / v.total : 0,
      }))
    }

    return NextResponse.json({ items, subjectAnalytics })
  } catch (error) {
    console.error('Personal results error:', error)
    return NextResponse.json({ error: 'Failed to load personal results' }, { status: 500 })
  }
}


