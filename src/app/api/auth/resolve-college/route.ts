import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CollegeSelectionResponse } from '@/types/auth';
import { z } from 'zod';

const resolveCollegeSchema = z.object({
  collegeUsername: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'College username can only contain letters, numbers, hyphens, and underscores'
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collegeUsername } = resolveCollegeSchema.parse(body);

    // Find college by username
    const college = await db.college.findUnique({
      where: { 
        username: collegeUsername,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true
      }
    });

    if (!college) {
      return NextResponse.json<CollegeSelectionResponse>({
        success: false,
        error: 'College not found or inactive'
      }, { status: 404 });
    }

    return NextResponse.json<CollegeSelectionResponse>({
      success: true,
      college
    });

  } catch (error) {
    console.error('Error resolving college:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json<CollegeSelectionResponse>({
        success: false,
        error: 'Invalid college username format'
      }, { status: 400 });
    }

    return NextResponse.json<CollegeSelectionResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
