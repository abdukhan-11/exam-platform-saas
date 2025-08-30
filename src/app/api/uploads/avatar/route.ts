import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { getCloudinary, isCloudinaryConfigured } from '@/lib/utils/cloudinary';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    // Any authenticated user can upload own avatar; admins can upload for others via profile update
    // Additional fine-grained permission checks can be added here if needed.

    if (!isCloudinaryConfigured()) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Basic validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    // @ts-ignore Blob type is available in edge runtime; keep safe check
    const mime = (file as any).type || '';
    if (!allowedTypes.includes(mime)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    const size = (file as any).size || 0;
    if (size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloud = getCloudinary();
    const upload = await new Promise<any>((resolve, reject) => {
      const stream = cloud.uploader.upload_stream(
        {
          folder: 'exam-platform/avatars',
          resource_type: 'image',
          transformation: [
            { width: 256, height: 256, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: upload.secure_url,
      publicId: upload.public_id,
      width: upload.width,
      height: upload.height,
      format: upload.format,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}


