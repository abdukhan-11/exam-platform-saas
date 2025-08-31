import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CollegeRegistrationCredentials } from '@/types/auth';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const collegeRegistrationSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, hyphens, and underscores'
  }),
  email: z.string().email(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6).max(100)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials = collegeRegistrationSchema.parse(body);

    // Check if college username already exists
    const existingCollege = await db.college.findUnique({
      where: { username: credentials.username }
    });

    if (existingCollege) {
      return NextResponse.json({
        success: false,
        error: 'College username already exists'
      }, { status: 409 });
    }

    // Check if admin email already exists
    const existingAdmin = await db.user.findFirst({
      where: { email: credentials.adminEmail }
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin email already registered'
      }, { status: 409 });
    }

    // Create college and admin user in a transaction
    const result = await db.$transaction(async (tx) => {
      // Generate college code from username
      const collegeCode = credentials.username.toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Create college
      const college = await tx.college.create({
        data: {
          name: credentials.name,
          username: credentials.username,
          code: collegeCode,
          email: credentials.email,
          address: credentials.address,
          phone: credentials.phone,
          website: credentials.website || null,
          isActive: true
        }
      });

      // Hash admin password
      const hashedPassword = await hashPassword(credentials.adminPassword);

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          name: credentials.adminName,
          email: credentials.adminEmail,
          password: hashedPassword,
          role: 'COLLEGE_ADMIN',
          collegeId: college.id,
          isActive: true
        }
      });

      return { college, adminUser };
    });

    return NextResponse.json({
      success: true,
      message: 'College registered successfully',
      college: {
        id: result.college.id,
        name: result.college.name,
        username: result.college.username
      }
    });

  } catch (error) {
    console.error('Error registering college:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
