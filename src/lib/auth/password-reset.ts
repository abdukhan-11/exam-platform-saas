import crypto from 'crypto';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { env } from '@/lib/env';

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Generate a password reset token for the given email
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    // Check if user exists
    const user = await db.user.findUnique({ where: { email } });
    const superAdmin = await db.superAdmin.findUnique({ where: { email } });
    
    if (!user && !superAdmin) {
      // Don't reveal if user exists or not for security
      return null;
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store the token in the database
    await db.passwordResetToken.create({
      data: {
        token,
        email,
        expiresAt,
      },
    });

    return token;
  } catch (error) {
    console.error('Failed to generate password reset token:', error);
    return null;
  }
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<{ email: string; valid: boolean }> {
  try {
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return { email: '', valid: false };
    }

    // Check if token is expired or already used
    if (resetToken.expiresAt < new Date() || resetToken.used) {
      return { email: '', valid: false };
    }

    return { email: resetToken.email, valid: true };
  } catch (error) {
    console.error('Failed to verify password reset token:', error);
    return { email: '', valid: false };
  }
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.used) {
      return false;
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    const user = await db.user.findUnique({ where: { email: resetToken.email } });
    if (user) {
      await db.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword },
      });
    } else {
      // Try super admin
      const superAdmin = await db.superAdmin.findUnique({ where: { email: resetToken.email } });
      if (superAdmin) {
        await db.superAdmin.update({
          where: { email: resetToken.email },
          data: { password: hashedPassword },
        });
      } else {
        return false;
      }
    }

    // Mark token as used
    await db.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    return true;
  } catch (error) {
    console.error('Failed to reset password:', error);
    return false;
  }
}

/**
 * Clean up expired password reset tokens
 */
export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  try {
    await db.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to cleanup expired password reset tokens:', error);
  }
}
