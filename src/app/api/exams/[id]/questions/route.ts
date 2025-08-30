import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/monitoring/error-tracking';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ip = _req.headers.get('x-forwarded-for') || _req.headers.get('x-real-ip') || 'unknown';
    const rl = consumeRateLimit({ ip, identifier: params.id, category: 'examOps' });
    if (!rl.allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const Schema = z.object({ id: z.string().min(1) });
    const ok = Schema.safeParse(params);
    if (!ok.success) return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

    const exam = await db.exam.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { createdAt: 'asc' } } }
    });
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = exam.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    captureError(error, { route: 'GET /api/exams/[id]/questions' });
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}


