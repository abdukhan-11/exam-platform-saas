import { getServerSession } from 'next-auth';
import { authOptions } from './nextauth-options';
import { UserSession } from '@/types/auth';

/**
 * Get properly typed server session
 */
export async function getTypedServerSession(): Promise<UserSession | null> {
  const session = await getServerSession(authOptions);
  return session as UserSession | null;
}

/**
 * Get session with required authentication
 * Throws error if not authenticated
 */
export async function getRequiredSession(): Promise<UserSession> {
  const session = await getTypedServerSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}
