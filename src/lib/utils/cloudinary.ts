import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/lib/env';

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* env vars.');
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}


