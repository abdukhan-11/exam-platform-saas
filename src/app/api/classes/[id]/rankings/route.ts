import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { PermissionService, Permission } from '@/lib/user-management/permissions'
import { getSubjectCumulativeRanking } from '@/lib/exams/ranking'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUser = session.user as any

    const cls = await db.class.findUnique({ where: { id: params.id }, select: { id: true, collegeId: true } })
    if (!cls) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM, Permission.READ_ANALYTICS])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (currentUser.role !== 'SUPER_ADMIN' && cls.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const classmates = await db.enrollment.findMany({ where: { classId: cls.id, status: 'ACTIVE' }, select: { userId: true } })
    const classUserIds = classmates.map(c => c.userId)
    const leaderboard = await getSubjectCumulativeRanking(undefined as unknown as string, classUserIds)

    const items = leaderboard.map((e, idx) => ({
      rank: idx + 1,
      userId: e.userId,
      overallScore: e.score,
      overallTotal: e.totalMarks,
      overallAveragePercentage: e.percentage,
      recentPerformance: e.recentPerformance ?? null,
      rollNo: e.rollNo ?? null,
    }))

    return NextResponse.json({ items, of: items.length })
  } catch (error) {
    console.error('Class overall ranking error:', error)
    return NextResponse.json({ error: 'Failed to build class rankings' }, { status: 500 })
  }
}
