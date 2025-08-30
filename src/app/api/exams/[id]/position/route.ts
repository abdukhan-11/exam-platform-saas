import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth-options'
import { db } from '@/lib/db'
import { getExamRanking } from '@/lib/exams/ranking'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUser = session.user as any

    const { id } = await params
    const exam = await db.exam.findUnique({ where: { id }, select: { id: true, collegeId: true } })
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Scope check for non-super users
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leaderboard = await getExamRanking(exam.id)
    const of = leaderboard.length
    const idx = leaderboard.findIndex(e => e.userId === currentUser.id)

    if (idx === -1) return NextResponse.json({ rank: null, of })

    return NextResponse.json({ rank: idx + 1, of })
  } catch (error) {
    console.error('Exam position error:', error)
    return NextResponse.json({ error: 'Failed to get exam position' }, { status: 500 })
  }
}
