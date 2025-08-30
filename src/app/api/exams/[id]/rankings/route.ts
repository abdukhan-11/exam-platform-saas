import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { PermissionService, Permission } from '@/lib/user-management/permissions'
import { getExamRanking } from '@/lib/exams/ranking'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUser = session.user as any

    const exam = await db.exam.findUnique({ where: { id: params.id }, select: { id: true, collegeId: true } })
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM, Permission.READ_ANALYTICS])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leaderboard = await getExamRanking(exam.id)
    const items = leaderboard.map((e, idx) => ({
      rank: idx + 1,
      userId: e.userId,
      score: e.score,
      totalMarks: e.totalMarks,
      percentage: e.percentage,
      recentPerformance: e.recentPerformance ?? null,
      completionTimeMs: e.completionTimeMs ?? null,
      rollNo: e.rollNo ?? null,
    }))

    return NextResponse.json({ items, of: items.length })
  } catch (error) {
    console.error('Exam ranking error:', error)
    return NextResponse.json({ error: 'Failed to build exam rankings' }, { status: 500 })
  }
}
