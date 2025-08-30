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
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.CREATE_QUESTION, Permission.UPDATE_QUESTION])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloud = getCloudinary();
    const upload = await new Promise<any>((resolve, reject) => {
      const stream = cloud.uploader.upload_stream(
        {
          folder: 'exam-platform/questions',
          resource_type: 'image',
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
    console.error('Image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}


