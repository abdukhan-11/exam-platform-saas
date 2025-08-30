import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/monitoring/error-tracking';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = _req.headers.get('x-forwarded-for') || _req.headers.get('x-real-ip') || 'unknown';
    const { id } = await params;
    const rl = consumeRateLimit({ ip, identifier: id, category: 'general' });
    if (!rl.allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const res = await db.examResult.findUnique({
      where: { userId_examId: { userId: currentUser.id, examId: id } }
    });
    if (!res) return NextResponse.json({ error: 'Result not found' }, { status: 404 });

    return NextResponse.json({ score: res.score, totalMarks: res.totalMarks, percentage: res.percentage });
  } catch (error) {
    captureError(error, { route: 'GET /api/results/exams/[id]/mine' });
    return NextResponse.json({ error: 'Failed to load result' }, { status: 500 });
  }
}


