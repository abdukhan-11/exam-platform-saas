import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken, storeRefreshToken } from '@/lib/auth/token-service';
import { AuthResponse, RegisterCredentials, LoginCredentials, AppRole } from '@/types/auth';
import { UserRole } from '@prisma/client';

export async function registerUser(credentials: RegisterCredentials): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: credentials.email },
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await hashPassword(credentials.password);

    // Create user with proper role handling
    const userRole = credentials.role && credentials.role !== 'SUPER_ADMIN' 
      ? credentials.role as UserRole 
      : UserRole.STUDENT;

    const user = await db.user.create({
      data: {
        name: credentials.name,
        email: credentials.email,
        password: hashedPassword,
        role: userRole,
        collegeId: credentials.collegeId,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role as AppRole,
      collegeId: user.collegeId || undefined,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      role: user.role as AppRole,
      collegeId: user.collegeId || undefined,
    });

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as AppRole,
        collegeId: user.collegeId || undefined,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error instanceof Error ? error.message : 'Registration failed');
  }
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // Try to find user first
    const user = await db.user.findUnique({
      where: { email: credentials.email },
    });

    let role: AppRole = (user?.role as AppRole) || 'STUDENT';
    let userId = user?.id;
    let userName = user?.name;
    let userEmail = user?.email;
    let userCollegeId = user?.collegeId || undefined;

    // If not found, try super admin
    if (!user) {
      const superAdmin = await db.superAdmin.findUnique({
        where: { email: credentials.email },
      });

      if (superAdmin) {
        role = AppRole.SUPER_ADMIN;
        userId = superAdmin.id;
        userName = superAdmin.name;
        userEmail = superAdmin.email;
        userCollegeId = undefined;
      }
    }

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials or account inactive');
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: userId!,
      role,
      collegeId: userCollegeId,
    });

    const refreshToken = generateRefreshToken({
      id: userId!,
      role,
      collegeId: userCollegeId,
    });

    // Store refresh token (only for regular users, not super admins)
    if (role !== AppRole.SUPER_ADMIN) {
      await storeRefreshToken(userId!, refreshToken);
    }

    return {
      user: {
        id: userId!,
        name: userName!,
        email: userEmail!,
        role,
        collegeId: userCollegeId || undefined,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error instanceof Error ? error.message : 'Login failed');
  }
}

export async function registerSuperAdmin(credentials: RegisterCredentials): Promise<AuthResponse> {
  try {
    // Check if super admin already exists
    const existingAdmin = await db.superAdmin.findUnique({
      where: { email: credentials.email },
    });

    if (existingAdmin) {
      throw new Error('Super admin already exists with this email');
    }

    // Hash password
    const hashedPassword = await hashPassword(credentials.password);

    // Create super admin
    const superAdmin = await db.superAdmin.create({
      data: {
        name: credentials.name,
        email: credentials.email,
        password: hashedPassword,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      id: superAdmin.id,
      role: AppRole.SUPER_ADMIN,
    });

    const refreshToken = generateRefreshToken({
      id: superAdmin.id,
      role: AppRole.SUPER_ADMIN,
    });

    // Store refresh token
    await storeRefreshToken(superAdmin.id, refreshToken);

    return {
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: AppRole.SUPER_ADMIN,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Super admin registration error:', error);
    throw new Error(error instanceof Error ? error.message : 'Super admin registration failed');
  }
}
