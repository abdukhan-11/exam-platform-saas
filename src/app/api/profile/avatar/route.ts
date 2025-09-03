import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { ProfileService } from '@/lib/user-management/profile-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const avatarFile = formData.get('avatar') as File;

    if (!avatarFile) {
      return NextResponse.json({ error: 'No avatar file provided' }, { status: 400 });
    }

    // Validate file type
    if (!avatarFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // In a real application, you would upload the file to a cloud storage service
    // For now, we'll create a placeholder URL
    const avatarUrl = `/avatars/${session.user.id}-${Date.now()}.${avatarFile.name.split('.').pop()}`;

    const profileService = new ProfileService(db);
    await profileService.updateUserAvatar(session.user.id, avatarUrl, session.user.id);

    return NextResponse.json({ avatarUrl });

  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
