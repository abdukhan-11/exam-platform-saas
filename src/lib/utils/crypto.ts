import crypto from 'crypto';

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string with custom characters
 */
export function generateSecureString(
  length: number = 32,
  characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

/**
 * Generate a numeric verification code
 */
export function generateVerificationCode(length: number = 6): string {
  return generateSecureString(length, '0123456789');
}

/**
 * Generate a password reset token
 */
export function generatePasswordResetToken(): string {
  return generateSecureToken(32);
}

/**
 * Generate an invitation token
 */
export function generateInvitationToken(): string {
  return generateSecureToken(32);
}

/**
 * Hash a string using SHA-256
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Create HMAC signature
 */
export function createHmacSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmacSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Generate a secure random UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Encrypt data using AES-256-CBC
 */
export function encryptData(data: string, key: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16); // 16 bytes for CBC
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  const cipher = crypto.createCipher(algorithm, keyBuffer);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: '', // No tag for CBC mode
  };
}

/**
 * Decrypt data using AES-256-CBC
 */
export function decryptData(
  encrypted: string,
  key: string,
  iv: string,
  tag: string
): string {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  const decipher = crypto.createDecipher(algorithm, keyBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
