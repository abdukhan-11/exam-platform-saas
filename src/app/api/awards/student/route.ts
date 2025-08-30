import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';

// Returns student's awards and rankings context:
// - overall position within enrolled class (by average percentage)
// - subject-wise ranking positions (by average percentage per subject)
// - achievement badges based on milestones
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;
    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine student's active class via latest enrollment
    const enrollment = await db.enrollment.findFirst({
      where: { userId: currentUser.id, status: 'ACTIVE' },
      orderBy: { enrollmentDate: 'desc' },
      select: { classId: true },
    });

    const classId = enrollment?.classId ?? null;

    // Fetch all student results to compute averages
    const studentResults = await db.examResult.findMany({
      where: { userId: currentUser.id },
      select: {
        percentage: true,
        exam: { select: { subjectId: true, subject: { select: { id: true, name: true, code: true } } } },
      },
    });

    // Subject-wise aggregates for current student
    const bySubject = new Map<string, { name: string; code: string | null; sum: number; count: number }>();
    for (const r of studentResults) {
      const sid = r.exam.subjectId;
      const name = r.exam.subject?.name ?? sid;
      const code = r.exam.subject?.code ?? null;
      const prev = bySubject.get(sid) ?? { name, code, sum: 0, count: 0 };
      prev.sum += r.percentage;
      prev.count += 1;
      bySubject.set(sid, prev);
    }
    const subjectAverages = Array.from(bySubject.entries()).map(([subjectId, v]) => ({
      subjectId,
      subjectName: v.name,
      subjectCode: v.code,
      averagePercentage: v.count ? v.sum / v.count : 0,
    }));

    // Overall average for current student
    const overallAvg = studentResults.length
      ? studentResults.reduce((a, b) => a + b.percentage, 0) / studentResults.length
      : 0;

    // Compute class rankings if classId available
    let classRankingPosition: number | null = null;
    let classRankingSize: number | null = null;
    const subjectRankings: Array<{ subjectId: string; subjectName: string; rank: number; of: number }> = [];

    if (classId) {
      // Get classmates
      const classmates = await db.enrollment.findMany({
        where: { classId, status: 'ACTIVE' },
        select: { userId: true },
      });
      const classUserIds = classmates.map((c) => c.userId);
      if (classUserIds.length) {
        // Overall averages per classmate
        const classResults = await db.examResult.findMany({
          where: { userId: { in: classUserIds } },
          select: { userId: true, percentage: true },
        });
        const totals = new Map<string, { sum: number; count: number }>();
        for (const r of classResults) {
          const prev = totals.get(r.userId) ?? { sum: 0, count: 0 };
          prev.sum += r.percentage;
          prev.count += 1;
          totals.set(r.userId, prev);
        }
        const leaderboard = Array.from(totals.entries()).map(([userId, v]) => ({
          userId,
          average: v.count ? v.sum / v.count : 0,
        }))
        .sort((a, b) => b.average - a.average);

        classRankingSize = leaderboard.length;
        classRankingPosition = leaderboard.findIndex((x) => x.userId === currentUser.id);
        if (classRankingPosition !== -1) classRankingPosition += 1; else classRankingPosition = null;

        // Subject-wise ranks
        if (bySubject.size) {
          const subjectIds = Array.from(bySubject.keys());
          for (const sid of subjectIds) {
            const res = await db.examResult.findMany({
              where: { userId: { in: classUserIds }, exam: { subjectId: sid } },
              select: { userId: true, percentage: true },
            });
            const t = new Map<string, { sum: number; count: number }>();
            for (const r of res) {
              const prev = t.get(r.userId) ?? { sum: 0, count: 0 };
              prev.sum += r.percentage;
              prev.count += 1;
              t.set(r.userId, prev);
            }
            const lb = Array.from(t.entries()).map(([userId, v]) => ({ userId, average: v.count ? v.sum / v.count : 0 }))
              .sort((a, b) => b.average - a.average);
            const rankIndex = lb.findIndex((x) => x.userId === currentUser.id);
            const subjectName = bySubject.get(sid)?.name ?? sid;
            subjectRankings.push({ subjectId: sid, subjectName, rank: rankIndex === -1 ? lb.length : rankIndex + 1, of: lb.length });
          }
        }
      }
    }

    // Simple achievement badges
    const badges: Array<{ key: string; label: string }> = [];
    if (overallAvg >= 90) badges.push({ key: 'top-performer', label: 'Top Performer (90%+)' });
    if (overallAvg >= 75) badges.push({ key: 'honor-roll', label: 'Honor Roll (75%+)' });
    const perfects = await db.examResult.count({ where: { userId: currentUser.id, percentage: { gte: 100 } } });
    if (perfects > 0) badges.push({ key: 'perfect-score', label: 'Perfect Score' });
    const improvements = await db.examResult.findMany({
      where: { userId: currentUser.id },
      orderBy: { endTime: 'asc' },
      select: { percentage: true },
    });
    if (improvements.length >= 3) {
      let streak = 1;
      for (let i = 1; i < improvements.length; i++) {
        if (improvements[i].percentage >= improvements[i - 1].percentage) streak += 1; else streak = 1;
      }
      if (streak >= 3) badges.push({ key: 'improvement-streak', label: 'Improvement Streak' });
    }

    return NextResponse.json({
      overallAverage: overallAvg,
      classRanking: classRankingPosition ? { position: classRankingPosition, of: classRankingSize } : null,
      subjectAverages,
      subjectRankings,
      badges,
    });
  } catch (error) {
    console.error('Awards API error:', error);
    return NextResponse.json({ error: 'Failed to compute awards' }, { status: 500 });
  }
}


