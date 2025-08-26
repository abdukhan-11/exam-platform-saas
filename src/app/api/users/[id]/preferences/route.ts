import { NextRequest, NextResponse } from 'next/server';
import { getTypedServerSession } from '@/lib/auth/session-utils';
import { ProfileService } from '@/lib/user-management/profile-service';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const preferencesSchema = z.object({
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    examReminders: z.boolean().optional(),
    gradeNotifications: z.boolean().optional(),
  }).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // Users can only view their own preferences
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profileService = new ProfileService(prisma);
    const preferences = await profileService.getUserPreferences(userId);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const body = await request.json();
    const preferences = preferencesSchema.parse(body);

    // Users can only update their own preferences
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profileService = new ProfileService(prisma);
    await profileService.updateUserPreferences(userId, preferences, session.user.id);

    return NextResponse.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
