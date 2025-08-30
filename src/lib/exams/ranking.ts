import { db } from '@/lib/db'

export interface RankedEntry {
  userId: string
  totalMarks: number
  score: number
  percentage: number
  recentPerformance?: number
  completionTimeMs?: number | null
  rollNo?: string | null
}

export interface RankingResult {
  rank: number
  of: number
}

// Tie-breaker sequence: total marks (desc), recent performance (desc), completion time (asc), roll number (asc)
export function compareWithTieBreakers(a: RankedEntry, b: RankedEntry): number {
  // 1) Higher totalMarks wins
  if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks
  // 2) Higher recentPerformance wins (undefined treated as 0)
  const ar = a.recentPerformance ?? 0
  const br = b.recentPerformance ?? 0
  if (br !== ar) return br - ar
  // 3) Lower completion time wins (nulls last)
  if (a.completionTimeMs == null && b.completionTimeMs != null) return 1
  if (b.completionTimeMs == null && a.completionTimeMs != null) return -1
  if (a.completionTimeMs != null && b.completionTimeMs != null && a.completionTimeMs !== b.completionTimeMs) {
    return a.completionTimeMs - b.completionTimeMs
  }
  // 4) Lower rollNo wins (string ascending, nulls last)
  const arn = a.rollNo ?? '\uFFFF'
  const brn = b.rollNo ?? '\uFFFF'
  if (arn < brn) return -1
  if (arn > brn) return 1
  return 0
}

export async function getExamRanking(examId: string): Promise<RankedEntry[]> {
  const [results, users] = await Promise.all([
    db.examResult.findMany({
      where: { examId },
      select: { userId: true, score: true, totalMarks: true, percentage: true, startTime: true, endTime: true },
    }),
    db.user.findMany({ select: { id: true, rollNo: true } }),
  ])
  const byUser = new Map<string, string | null>()
  for (const u of users) byUser.set(u.id, u.rollNo ?? null)

  const entries: RankedEntry[] = results.map((r) => ({
    userId: r.userId,
    score: r.score,
    totalMarks: r.totalMarks,
    percentage: r.percentage,
    recentPerformance: r.percentage, // for a single exam, recent == this
    completionTimeMs: r.endTime ? (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) : null,
    rollNo: byUser.get(r.userId) ?? null,
  }))

  return entries.sort(compareWithTieBreakers)
}

export async function getSubjectCumulativeRanking(subjectId: string, classUserIds?: string[]): Promise<RankedEntry[]> {
  const where: any = { exam: { subjectId } }
  if (classUserIds && classUserIds.length) where.userId = { in: classUserIds }

  const [results, users] = await Promise.all([
    db.examResult.findMany({
      where,
      select: { userId: true, percentage: true, score: true, totalMarks: true, endTime: true },
    }),
    db.user.findMany({ select: { id: true, rollNo: true } }),
  ])

  const byUser = new Map<string, { sumPct: number; sumScore: number; sumTotal: number; count: number; recent?: number }>()
  const latestByUser = new Map<string, Date>()
  for (const r of results) {
    const prev = byUser.get(r.userId) ?? { sumPct: 0, sumScore: 0, sumTotal: 0, count: 0, recent: undefined }
    prev.sumPct += r.percentage
    prev.sumScore += r.score
    prev.sumTotal += r.totalMarks
    prev.count += 1
    // track most recent percentage
    if (r.endTime) {
      const t = new Date(r.endTime)
      const last = latestByUser.get(r.userId)
      if (!last || t > last) {
        latestByUser.set(r.userId, t)
        prev.recent = r.percentage
      }
    }
    byUser.set(r.userId, prev)
  }

  const rollByUser = new Map<string, string | null>()
  for (const u of users) rollByUser.set(u.id, u.rollNo ?? null)

  const entries: RankedEntry[] = Array.from(byUser.entries()).map(([userId, v]) => ({
    userId,
    score: v.sumScore,
    totalMarks: v.sumTotal,
    percentage: v.count ? v.sumPct / v.count : 0,
    recentPerformance: v.recent ?? 0,
    completionTimeMs: null,
    rollNo: rollByUser.get(userId) ?? null,
  }))

  return entries.sort(compareWithTieBreakers)
}

export async function getClassOverallRanking(classId: string): Promise<RankedEntry[]> {
  const classmates = await db.enrollment.findMany({ where: { classId, status: 'ACTIVE' }, select: { userId: true } })
  const classUserIds = classmates.map((c) => c.userId)
  return getSubjectCumulativeRanking(undefined as unknown as string, classUserIds)
}


