import { UserRole } from '@prisma/client';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Ensure AppRole matches Prisma UserRole enum
export enum AppRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Type guard to ensure AppRole matches UserRole
export function isValidRole(role: string): role is AppRole {
  return Object.values(AppRole).includes(role as AppRole);
}

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

export interface StudentLoginCredentials {
  rollNo: string;
  password: string;
  collegeUsername: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: AppRole;
  collegeId?: string;
}

export interface CollegeRegistrationCredentials {
  name: string;
  username: string; // college_username
  email: string;
  address?: string;
  phone?: string;
  website?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
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

// New interfaces for college selection flow
export interface CollegeContext {
  collegeId: string;
  collegeName: string;
  collegeUsername: string;
  userRole: AppRole;
}

export interface CollegeSelectionResponse {
  success: boolean;
  college?: {
    id: string;
    name: string;
    username: string;
    isActive: boolean;
  };
  error?: string;
}
