import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';
import { AppRole } from './auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      collegeId?: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: AppRole;
    collegeId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: AppRole;
    collegeId?: string | null;
  }
}
