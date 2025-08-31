import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StudentLoginCredentials } from '@/types/auth';
import { verifyPassword } from '@/lib/auth/password';
import { z } from 'zod';

const studentLoginSchema = z.object({
  rollNo: z.string().min(1).max(20),
  password: z.string().min(1),
  collegeUsername: z.string().min(3).max(50)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials = studentLoginSchema.parse(body);

    // First, resolve the college (use findFirst to include isActive filter)
    const college = await db.college.findFirst({
      where: { 
        username: credentials.collegeUsername,
        isActive: true 
      }
    });

    if (!college) {
      return NextResponse.json({
        success: false,
        error: 'College not found or inactive'
      }, { status: 404 });
    }

    // Find student profile by roll number within the college
    const studentProfile = await db.studentProfile.findUnique({
      where: {
        collegeId_rollNo: {
          collegeId: college.id,
          rollNo: credentials.rollNo
        }
      },
      include: {
        user: true
      }
    });

    if (!studentProfile || !studentProfile.user) {
      return NextResponse.json({
        success: false,
        error: 'Student not found'
      }, { status: 404 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, studentProfile.user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Check if user is active
    if (!studentProfile.user.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Account is deactivated'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: studentProfile.user.id,
        name: studentProfile.user.name,
        email: studentProfile.user.email,
        role: studentProfile.user.role,
        collegeId: college.id,
        rollNo: studentProfile.rollNo
      }
    });

  } catch (error) {
    console.error('Error in student login:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
