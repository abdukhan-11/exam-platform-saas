import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { PermissionService, Permission } from '@/lib/user-management/permissions'
import { getSubjectCumulativeRanking } from '@/lib/exams/ranking'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUser = session.user as any

    const subject = await db.subject.findUnique({ where: { id: params.id }, select: { id: true, collegeId: true } })
    if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM, Permission.READ_ANALYTICS])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (currentUser.role !== 'SUPER_ADMIN' && subject.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const classId = searchParams.get('classId') || undefined

    let classUserIds: string[] | undefined
    if (classId) {
      const classmates = await db.enrollment.findMany({ where: { classId, status: 'ACTIVE' }, select: { userId: true } })
      classUserIds = classmates.map(c => c.userId)
    }

    const leaderboard = await getSubjectCumulativeRanking(subject.id, classUserIds)
    const items = leaderboard.map((e, idx) => ({
      rank: idx + 1,
      userId: e.userId,
      score: e.score,
      totalMarks: e.totalMarks,
      averagePercentage: e.percentage,
      recentPerformance: e.recentPerformance ?? null,
      rollNo: e.rollNo ?? null,
    }))

    return NextResponse.json({ items, of: items.length })
  } catch (error) {
    console.error('Subject ranking error:', error)
    return NextResponse.json({ error: 'Failed to build subject rankings' }, { status: 500 })
  }
}
