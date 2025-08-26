import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { ProfileService } from '@/lib/user-management/profile-service';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      examReminders: z.boolean().optional(),
      gradeNotifications: z.boolean().optional(),
    }).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  teacherFields: z.object({
    subjects: z.array(z.string()).optional(),
    qualifications: z.array(z.string()).optional(),
    experience: z.number().min(0).max(50).optional(),
    officeHours: z.string().optional(),
    officeLocation: z.string().optional(),
  }).optional(),
  studentFields: z.object({
    studentId: z.string().optional(),
    year: z.number().min(1).max(10).optional(),
    major: z.string().optional(),
    gpa: z.number().min(0).max(4).optional(),
    expectedGraduation: z.string().datetime().optional(),
  }).optional(),
  collegeAdminFields: z.object({
    permissions: z.array(z.string()).optional(),
    department: z.string().optional(),
    responsibilities: z.array(z.string()).optional(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Type assertion for custom session properties
    const currentUser = session.user as any;
    const userId = params.id;

    // Users can view their own profile, or admins can view any profile
    if (currentUser.id !== userId) {
      if (!PermissionService.hasPermission(currentUser.role, Permission.READ_USER)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const profileService = new ProfileService(db);
    const profile = await profileService.getUserProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Type assertion for custom session properties
    const currentUser = session.user as any;
    const userId = params.id;
    const body = await request.json();
    const parsedData = profileUpdateSchema.parse(body);
    
    // Convert string dates to Date objects
    const updateData: any = {
      ...parsedData,
      studentFields: parsedData.studentFields ? {
        ...parsedData.studentFields,
        expectedGraduation: parsedData.studentFields.expectedGraduation 
          ? new Date(parsedData.studentFields.expectedGraduation)
          : undefined
      } : undefined
    };

    // Users can update their own profile, or admins can update any profile
    if (currentUser.id !== userId) {
      if (!PermissionService.hasPermission(currentUser.role, Permission.UPDATE_USER)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const profileService = new ProfileService(db);
    const updatedProfile = await profileService.updateUserProfile(
      userId,
      updateData,
      currentUser.id
    );

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
