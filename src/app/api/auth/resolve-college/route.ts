import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { consumeRateLimit } from '@/lib/security/rate-limit';

const BodySchema = z.object({
  collegeUsername: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = consumeRateLimit({ ip, identifier: 'resolve-college', category: 'auth' });
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too Many Requests' }, { status: 429 });

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const username = parsed.data.collegeUsername.trim();
    const college = await db.college.findUnique({ where: { username } });

    if (!college || !college.isActive) {
      return NextResponse.json({ success: false, error: 'College not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      college: {
        id: college.id,
        name: college.name,
        username: college.username,
        code: college.code,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
