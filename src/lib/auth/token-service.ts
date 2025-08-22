import jwt from 'jsonwebtoken';
import { AppRole } from '@/types/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

interface TokenPayload {
  id: string;
  role?: AppRole;
  collegeId?: string;
  superAdminId?: string;
  [key: string]: string | undefined;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    payload,
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  try {
    await db.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

export async function invalidateRefreshToken(token: string): Promise<void> {
  try {
    await db.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  } catch (error) {
    console.error('Failed to invalidate refresh token:', error);
    throw new Error('Failed to invalidate refresh token');
  }
}

export async function rotateRefreshToken(oldToken: string, userId: string, role: AppRole): Promise<string | null> {
  try {
    // Invalidate old token
    await invalidateRefreshToken(oldToken);
    
    // Generate new refresh token
    const newToken = generateRefreshToken({ id: userId, role });
    
    // Store new token
    await storeRefreshToken(userId, newToken);
    
    return newToken;
  } catch (error) {
    console.error('Failed to rotate refresh token:', error);
    return null;
  }
}

export async function validateRefreshToken(token: string): Promise<boolean> {
  try {
    const refreshToken = await db.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return false;
    }

    if (refreshToken.revoked || refreshToken.expiresAt < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to validate refresh token:', error);
    return false;
  }
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    await db.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  } catch (error) {
    console.error('Failed to revoke all user tokens:', error);
    throw new Error('Failed to revoke all user tokens');
  }
}
