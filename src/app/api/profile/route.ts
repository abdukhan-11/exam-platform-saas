import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { ProfileService } from '@/lib/user-management/profile-service';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  studentFields: z.object({
    year: z.number().min(1).max(10).optional(),
    major: z.string().optional(),
    gpa: z.number().min(0).max(4).optional(),
    expectedGraduation: z.string().datetime().transform((str) => new Date(str)).optional()
  }).transform((data) => ({
    ...data,
    expectedGraduation: data.expectedGraduation ? new Date(data.expectedGraduation) : null
  })).optional(),
  teacherFields: z.object({
    subjects: z.array(z.string()).optional(),
    qualifications: z.array(z.string()).optional(),
    experience: z.number().min(0).max(50).optional(),
    officeHours: z.string().optional(),
    officeLocation: z.string().optional()
  }).optional(),
  collegeAdminFields: z.object({
    permissions: z.array(z.string()).optional(),
    department: z.string().optional(),
    responsibilities: z.array(z.string()).optional()
  }).optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileService = new ProfileService(db);
    const profile = await profileService.getUserProfile(session.user.id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);

    const profileService = new ProfileService(db);
    const updatedProfile = await profileService.updateUserProfile(
      session.user.id,
      parsed,
      session.user.id
    );

    return NextResponse.json(updatedProfile);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
