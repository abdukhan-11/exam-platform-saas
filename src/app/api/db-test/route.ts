import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const counts = await Promise.all([
      prisma.superAdmin.count(),
      prisma.college.count(),
      prisma.subject.count(),
      prisma.user.count(),
    ]);
    return NextResponse.json({
      ok: true,
      tables: {
        superAdmins: counts[0],
        colleges: counts[1],
        subjects: counts[2],
        users: counts[3],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
