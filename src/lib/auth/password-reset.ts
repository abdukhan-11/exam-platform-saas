// Password reset functionality is temporarily disabled due to missing database model
// TODO: Add passwordResetToken model to schema or implement alternative approach

// Placeholder exports to prevent import errors
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  console.warn('Password reset functionality is disabled');
  return null;
}

export async function verifyPasswordResetToken(token: string): Promise<{ email: string; valid: boolean }> {
  console.warn('Password reset functionality is disabled');
  return { email: '', valid: false };
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  console.warn('Password reset functionality is disabled');
  return false;
}

export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  console.warn('Password reset functionality is disabled');
}
