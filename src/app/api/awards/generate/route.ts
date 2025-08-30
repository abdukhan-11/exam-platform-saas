import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { PermissionService, Permission } from '@/lib/user-management/permissions'
import { getExamRanking, getSubjectCumulativeRanking } from '@/lib/exams/ranking'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUser = session.user as any

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_ANALYTICS])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope') || 'exam' // exam | subject | class
    const id = searchParams.get('id') // examId | subjectId | classId
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Authorization scope check by entity
    if (scope === 'exam') {
      const exam = await db.exam.findUnique({ where: { id }, select: { collegeId: true } })
      if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (scope === 'subject') {
      const subject = await db.subject.findUnique({ where: { id }, select: { collegeId: true } })
      if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (currentUser.role !== 'SUPER_ADMIN' && subject.collegeId !== currentUser.collegeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (scope === 'class') {
      const cls = await db.class.findUnique({ where: { id }, select: { collegeId: true } })
      if (!cls) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (currentUser.role !== 'SUPER_ADMIN' && cls.collegeId !== currentUser.collegeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Build leaderboards
    let leaderboard: Array<{ userId: string; percentage: number; score: number; totalMarks: number }> = []
    if (scope === 'exam') {
      const lb = await getExamRanking(id)
      leaderboard = lb.map(x => ({ userId: x.userId, percentage: x.percentage, score: x.score, totalMarks: x.totalMarks }))
    } else if (scope === 'subject') {
      const lb = await getSubjectCumulativeRanking(id)
      leaderboard = lb.map(x => ({ userId: x.userId, percentage: x.percentage, score: x.score, totalMarks: x.totalMarks }))
    } else {
      // class overall via cumulative across all subjects for class users
      const classmates = await db.enrollment.findMany({ where: { classId: id, status: 'ACTIVE' }, select: { userId: true } })
      const classUserIds = classmates.map(c => c.userId)
      const lb = await getSubjectCumulativeRanking(undefined as unknown as string, classUserIds)
      leaderboard = lb.map(x => ({ userId: x.userId, percentage: x.percentage, score: x.score, totalMarks: x.totalMarks }))
    }

    // Toppers (top N by percentage)
    const toppers = leaderboard
      .slice(0, limit)
      .map((x, idx) => ({ rank: idx + 1, userId: x.userId, percentage: x.percentage, score: x.score, totalMarks: x.totalMarks }))

    // Improvement awards: users with positive trend in last 3 results
    const userIds = leaderboard.map(x => x.userId)
    const histories = await db.examResult.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, percentage: true, endTime: true },
      orderBy: { endTime: 'asc' },
    })
    const improvementMap = new Map<string, number>()
    for (const h of histories) {
      const prev = improvementMap.get(h.userId)
      if (prev == null) improvementMap.set(h.userId, 0)
    }
    for (const uid of userIds) {
      const hs = histories.filter(h => h.userId === uid && h.endTime)
      if (hs.length >= 3) {
        let streak = 1
        for (let i = 1; i < hs.length; i++) {
          if (hs[i].percentage >= hs[i - 1].percentage) streak += 1; else streak = 1
        }
        if (streak >= 3) improvementMap.set(uid, streak)
      }
    }
    const improvementAwards = Array.from(improvementMap.entries())
      .filter(([, streak]) => streak >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, streak]) => ({ userId, streak }))

    // Subject excellence: for subject scope, top by average in that subject (already same as toppers). For other scopes, compute best subject per user
    let subjectExcellence: Array<{ userId: string; subjectId: string; averagePercentage: number }> = []
    if (scope === 'subject') {
      subjectExcellence = toppers.map(t => ({ userId: t.userId, subjectId: id, averagePercentage: t.percentage }))
    } else {
      const subjects = await db.subject.findMany({ select: { id: true } })
      for (const uid of userIds) {
        let best: { subjectId: string; avg: number } | null = null
        for (const s of subjects) {
          const rs = await db.examResult.findMany({ where: { userId: uid, exam: { subjectId: s.id } }, select: { percentage: true } })
          if (rs.length) {
            const avg = rs.reduce((a, b) => a + b.percentage, 0) / rs.length
            if (!best || avg > best.avg) best = { subjectId: s.id, avg }
          }
        }
        if (best) subjectExcellence.push({ userId: uid, subjectId: best.subjectId, averagePercentage: best.avg })
      }
      subjectExcellence = subjectExcellence.sort((a, b) => b.averagePercentage - a.averagePercentage).slice(0, limit)
    }

    return NextResponse.json({ toppers, improvementAwards, subjectExcellence })
  } catch (error) {
    console.error('Awards generation error:', error)
    return NextResponse.json({ error: 'Failed to generate awards' }, { status: 500 })
  }
}
