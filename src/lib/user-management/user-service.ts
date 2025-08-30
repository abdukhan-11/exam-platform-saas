import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const CreateUserSchema = z.object({
  email: z.string().email().optional(),
  rollNo: z.string().optional(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  collegeId: z.string(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  rollNo: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UserInvitationSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  collegeId: z.string(),
  invitedBy: z.string(),
  message: z.string().optional(),
});

export type UserWithCollege = Prisma.UserGetPayload<{ include: { college: true } }>;

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  collegeId: string;
  invitedBy: string;
  message?: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export interface BulkUserImport {
  users: Array<{
    email?: string;
    rollNo?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
  }>;
  collegeId: string;
  importedBy: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class UserManagementService {
  /**
   * Create a new user with proper validation and role assignment
   */
  async createUser(data: z.infer<typeof CreateUserSchema>): Promise<UserWithCollege> {
    const validatedData = CreateUserSchema.parse(data);
    
    // Check if user already exists
    const existingUser = await this.findUserByEmailOrRollNo(
      validatedData.email,
      validatedData.rollNo,
      validatedData.collegeId
    );
    
    if (existingUser) {
      throw new Error('User with this email or roll number already exists in this college');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
        email: validatedData.email || '',
        password: hashedPassword,
        role: validatedData.role,
        collegeId: validatedData.collegeId,
        isActive: validatedData.isActive,
      },
      include: {
        college: true,
      },
    });

    // Log user creation activity
    await this.logUserActivity(user.id, 'USER_CREATED', {
      createdBy: 'system',
      role: user.role,
      collegeId: user.collegeId,
    });

    return user as UserWithCollege;
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, data: z.infer<typeof UpdateUserSchema>): Promise<UserWithCollege> {
    const validatedData = UpdateUserSchema.parse(data);
    
    // Build update data object
    const updateData: any = {};
    if (validatedData.firstName || validatedData.lastName) {
      updateData.name = `${validatedData.firstName || ''} ${validatedData.lastName || ''}`.trim();
    }
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        college: true,
      },
    });

    // Log user update activity
    await this.logUserActivity(userId, 'USER_UPDATED', {
      updatedFields: Object.keys(validatedData),
      updatedBy: 'system',
    });

    return user as UserWithCollege;
  }

  /**
   * Deactivate a user account
   */
  async deactivateUser(userId: string, deactivatedBy: string): Promise<UserWithCollege> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: {
        college: true,
      },
    });

    // Log user deactivation
    await this.logUserActivity(userId, 'USER_DEACTIVATED', {
      deactivatedBy,
      reason: 'Manual deactivation',
    });

    return user as UserWithCollege;
  }

  /**
   * Reactivate a user account
   */
  async reactivateUser(userId: string, reactivatedBy: string): Promise<UserWithCollege> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      include: {
        college: true,
      },
    });

    // Log user reactivation
    await this.logUserActivity(userId, 'USER_REACTIVATED', {
      reactivatedBy,
      reason: 'Manual reactivation',
    });

    return user as UserWithCollege;
  }

  /**
   * Find user by email or roll number within a college
   */
  async findUserByEmailOrRollNo(
    email?: string,
    rollNo?: string,
    collegeId?: string
  ): Promise<UserWithCollege | null> {
    if (!email && !rollNo) return null;

    const whereClause: any = {};
    
    if (email) {
      whereClause.email = email;
    }
    if (rollNo) {
      whereClause.rollNo = rollNo;
    }
    if (collegeId) {
      whereClause.collegeId = collegeId;
    }

    return await prisma.user.findFirst({
      where: whereClause,
      include: {
        college: true,
      },
    }) as UserWithCollege | null;
  }

  /**
   * Get users with filtering and pagination
   */
  async getUsers(options: {
    collegeId?: string;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    users: UserWithCollege[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      collegeId,
      role,
      isActive,
      search,
      page = 1,
      limit = 10,
    } = options;

    const whereClause: any = {};

    if (collegeId) whereClause.collegeId = collegeId;
    if (role) whereClause.role = role;
    if (isActive !== undefined) whereClause.isActive = isActive;

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          college: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return {
      users: users as UserWithCollege[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create user invitation
   */
  async createUserInvitation(data: z.infer<typeof UserInvitationSchema>): Promise<UserInvitation> {
    const validatedData = UserInvitationSchema.parse(data);
    
    // Check if user already exists
    const existingUser = await this.findUserByEmailOrRollNo(
      validatedData.email,
      undefined,
      validatedData.collegeId
    );
    
    if (existingUser) {
      throw new Error('User with this email already exists in this college');
    }

    // Generate invitation token
    const token = this.generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation (this would be stored in a separate invitations table)
    const invitation: UserInvitation = {
      id: `inv_${Date.now()}`,
      ...validatedData,
      token,
      expiresAt,
      isUsed: false,
      createdAt: new Date(),
    };

    // Log invitation creation
    await this.logUserActivity(validatedData.invitedBy, 'USER_INVITATION_CREATED', {
      invitedEmail: validatedData.email,
      role: validatedData.role,
      collegeId: validatedData.collegeId,
    });

    return invitation;
  }

  /**
   * Accept user invitation and create account
   */
  async acceptInvitation(
    token: string,
    password: string,
    additionalData?: Partial<z.infer<typeof CreateUserSchema>>
  ): Promise<UserWithCollege> {
    // In a real implementation, you would validate the token from the database
    // For now, we'll simulate this
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation');
    }

    // Create user from invitation
    const userData: z.infer<typeof CreateUserSchema> = {
      email: invitation.email,
      password,
      firstName: additionalData?.firstName || '',
      lastName: additionalData?.lastName || '',
      role: invitation.role,
      collegeId: invitation.collegeId,
      isActive: true,
      ...additionalData,
    };

    const user = await this.createUser(userData);

    // Mark invitation as used
    await this.markInvitationAsUsed(token);

    // Log invitation acceptance
    await this.logUserActivity(user.id, 'USER_INVITATION_ACCEPTED', {
      invitationId: invitation.id,
      invitedBy: invitation.invitedBy,
    });

    return user;
  }

  /**
   * Bulk import users (typically for students)
   */
  async bulkImportUsers(data: BulkUserImport): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < data.users.length; i++) {
      try {
        const userData = data.users[i];
        const createData: z.infer<typeof CreateUserSchema> = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: 'temp_password_123', // Temporary password, should be changed on first login
          role: userData.role,
          collegeId: data.collegeId,
          isActive: true,
        };

        await this.createUser(createData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log bulk import activity
    await this.logUserActivity(data.importedBy, 'BULK_USER_IMPORT', {
      totalUsers: data.users.length,
      successCount: results.success,
      failedCount: results.failed,
      collegeId: data.collegeId,
    });

    return results;
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(
    userId?: string,
    action?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: UserActivityLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // In a real implementation, this would query an activity_logs table
    // For now, we'll return mock data
    const mockLogs: UserActivityLog[] = [
      {
        id: 'log_1',
        userId: userId || 'user_1',
        action: action || 'USER_LOGIN',
        details: { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(),
      },
    ];

    return {
      logs: mockLogs,
      total: mockLogs.length,
      page,
      limit,
      totalPages: 1,
    };
  }

  /**
   * Log user activity
   */
  async logUserActivity(
    userId: string,
    action: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // In a real implementation, this would save to an activity_logs table
    console.log('User Activity Log:', {
      userId,
      action,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Generate invitation token
   */
  private generateInvitationToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get invitation by token (mock implementation)
   */
  private async getInvitationByToken(token: string): Promise<UserInvitation | null> {
    // In a real implementation, this would query the invitations table
    return null;
  }

  /**
   * Mark invitation as used (mock implementation)
   */
  private async markInvitationAsUsed(token: string): Promise<void> {
    // In a real implementation, this would update the invitations table
    console.log('Marking invitation as used:', token);
  }
}

export const userManagementService = new UserManagementService();
