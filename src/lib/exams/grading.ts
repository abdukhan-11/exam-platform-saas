import { db } from '@/lib/db'

export interface GradeResolution {
  grade: string
  boundaryId?: string
}

/**
 * Resolve a grade string for a given percentage. Prefers college-specific
 * grade boundaries; falls back to global defaults (isDefault = true).
 */
export async function resolveGradeByPercentage(
  percentage: number,
  collegeId?: string | null
): Promise<GradeResolution> {
  const pid = isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0

  try {
    const prismaAny = db as any
    if (prismaAny?.gradeBoundary?.findMany) {
      // Try college-specific boundaries first, ordered by minPercentage desc to pick the tightest match
      const boundaries = await prismaAny.gradeBoundary.findMany({
        where: { OR: [{ collegeId: collegeId ?? undefined }, { isDefault: true }] },
        orderBy: [{ collegeId: 'desc' }, { minPercentage: 'desc' }, { sortOrder: 'asc' }],
      })

      for (const b of boundaries) {
        if (pid >= b.minPercentage && pid <= b.maxPercentage) {
          return { grade: b.grade, boundaryId: b.id }
        }
      }
    }
  } catch (e) {
    // If the table doesn't exist or Prisma client isn't migrated yet, silently fallback
  }

  // Fallbacks
  if (pid >= 90) return { grade: 'A+' }
  if (pid >= 80) return { grade: 'A' }
  if (pid >= 75) return { grade: 'B+' }
  if (pid >= 70) return { grade: 'B' }
  if (pid >= 60) return { grade: 'C' }
  if (pid >= 50) return { grade: 'D' }
  return { grade: 'F' }
}


