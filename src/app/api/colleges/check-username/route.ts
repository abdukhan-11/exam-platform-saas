import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const usernameCheckSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be no more than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = usernameCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        available: false,
        error: validation.error.issues[0]?.message || 'Invalid username format'
      }, { status: 400 });
    }

    const { username } = validation.data;

    // Check if username already exists
    const existingCollege = await db.college.findUnique({
      where: { username },
      select: { id: true, name: true }
    });

    if (existingCollege) {
      return NextResponse.json({
        available: false,
        message: `Username "${username}" is already taken by ${existingCollege.name}`
      });
    }

    return NextResponse.json({
      available: true,
      message: `Username "${username}" is available`
    });

  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json({
      available: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
