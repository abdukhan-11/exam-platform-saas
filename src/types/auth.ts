import { UserRole } from '@prisma/client';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

export type AppRole = UserRole | 'SUPER_ADMIN';

export interface UserSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: AppRole;
    collegeId?: string | null;
    image?: string | null;
  };
}

export interface UserJWT extends JWT {
  id: string;
  name?: string | null;
  email?: string | null;
  role: AppRole;
  collegeId?: string | null;
  image?: string | null;
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthError {
  status: number;
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: AppRole;
  collegeId?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: AppRole;
    collegeId?: string;
  };
  accessToken: string;
  refreshToken: string;
}
