import { PrismaClient, User, UserRole, College } from '@prisma/client';
import { AuditLogger } from '@/lib/security/audit-logger';

// Define a clean interface that matches the actual Prisma schema
export interface UserProfile {
  // Core User fields (matching Prisma schema exactly)
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  rollNo: string | null;
  password: string;
  role: UserRole;
  isActive: boolean;
  collegeId: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  bio: string | null;
  avatar: string | null;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  college: College | null;
  
  // Role-specific fields (extensions)
  teacherFields?: {
    subjects?: string[];
    qualifications?: string[];
    experience?: number;
    officeHours?: string;
    officeLocation?: string;
  };
  studentFields?: {
    studentId?: string;
    year?: number;
    major?: string;
    gpa?: number;
    expectedGraduation?: Date;
  };
  collegeAdminFields?: {
    permissions?: string[];
    department?: string;
    responsibilities?: string[];
  };
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  bio?: string;
  avatar?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      examReminders?: boolean;
      gradeNotifications?: boolean;
    };
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    timezone?: string;
  };
  // Role-specific fields
  teacherFields?: {
    subjects?: string[];
    qualifications?: string[];
    experience?: number;
    officeHours?: string;
    officeLocation?: string;
  };
  studentFields?: {
    studentId?: string;
    year?: number;
    major?: string;
    gpa?: number;
    expectedGraduation?: Date;
  };
  collegeAdminFields?: {
    permissions?: string[];
    department?: string;
    responsibilities?: string[];
  };
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ProfileService {
  private prisma: PrismaClient;
  private auditLogger: AuditLogger;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Get user profile with role-specific fields
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        college: true,
      },
    });

    if (!user) {
      return null;
    }

    // Add role-specific fields based on user role
    const profile = await this.enrichProfileWithRoleFields(user);
    return profile;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: ProfileUpdateData,
    updatedBy: string
  ): Promise<UserProfile> {
    // Validate the update data
    const validation = await this.validateProfileUpdate(userId, updateData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if email is being changed
    if (updateData.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email is already in use by another user');
      }
    }

    // Update basic profile fields
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
        department: updateData.department,
        position: updateData.position,
        bio: updateData.bio,
        avatar: updateData.avatar,
        preferences: updateData.preferences,
        updatedAt: new Date(),
      },
      include: {
        college: true,
      },
    });

    // Update role-specific fields
    await this.updateRoleSpecificFields(userId, updateData);

    // Log the profile update
    await this.auditLogger.logEvent({
      userId: updatedBy,
      action: 'USER_PROFILE_UPDATED',
      resourceType: 'USER',
      resourceId: userId,
      details: {
        updatedFields: Object.keys(updateData),
        targetUserId: userId,
      },
      ipAddress: 'system',
      userAgent: 'system',
    });

    // Return enriched profile
    return this.enrichProfileWithRoleFields(updatedUser);
  }

  /**
   * Update user avatar
   */
  async updateUserAvatar(
    userId: string,
    avatarUrl: string,
    updatedBy: string
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
        updatedAt: new Date(),
      },
    });

    await this.auditLogger.logEvent({
      userId: updatedBy,
      action: 'USER_AVATAR_UPDATED',
      resourceType: 'USER',
      resourceId: userId,
      details: {
        avatarUrl,
      },
      ipAddress: 'system',
      userAgent: 'system',
    });
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    return user?.preferences || {};
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: any,
    updatedBy: string
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences,
        updatedAt: new Date(),
      },
    });

    await this.auditLogger.logEvent({
      userId: updatedBy,
      action: 'USER_PREFERENCES_UPDATED',
      resourceType: 'USER',
      resourceId: userId,
      details: {
        preferences,
      },
      ipAddress: 'system',
      userAgent: 'system',
    });
  }

  /**
   * Get users by role with profile information
   */
  async getUsersByRole(
    role: UserRole,
    collegeId?: string,
    options: {
      limit?: number;
      offset?: number;
      includeInactive?: boolean;
    } = {}
  ): Promise<{ users: UserProfile[]; total: number }> {
    const { limit = 50, offset = 0, includeInactive = false } = options;

    const where = {
      role,
      ...(collegeId && { collegeId }),
      ...(includeInactive ? {} : { isActive: true }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          college: true,
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enrich profiles with role-specific fields
    const enrichedUsers = await Promise.all(
      users.map(user => this.enrichProfileWithRoleFields(user))
    );

    return { users: enrichedUsers, total };
  }

  /**
   * Search users by profile fields
   */
  async searchUsers(
    query: string,
    filters: {
      role?: UserRole;
      collegeId?: string;
      department?: string;
      isActive?: boolean;
    } = {},
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ users: UserProfile[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const where = {
      ...filters,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
        { department: { contains: query, mode: 'insensitive' as const } },
        { position: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          college: true,
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enrich profiles with role-specific fields
    const enrichedUsers = await Promise.all(
      users.map(user => this.enrichProfileWithRoleFields(user))
    );

    return { users: enrichedUsers, total };
  }

  /**
   * Enrich user profile with role-specific fields
   */
  private async enrichProfileWithRoleFields(user: User & { college: College | null }): Promise<UserProfile> {
    const profile = { ...user } as UserProfile;

    // Add role-specific fields based on user role
    switch (user.role) {
      case 'TEACHER':
        profile.teacherFields = await this.getTeacherFields(user.id);
        break;
      case 'STUDENT':
        profile.studentFields = await this.getStudentFields(user.id);
        break;
      case 'COLLEGE_ADMIN':
        profile.collegeAdminFields = await this.getCollegeAdminFields(user.id);
        break;
    }

    return profile;
  }

  /**
   * Get teacher-specific fields
   */
  private async getTeacherFields(userId: string): Promise<any> {
    // In a real implementation, you might have a separate TeacherProfile table
    // For now, we'll return mock data or extend the User model
    return {
      subjects: [],
      qualifications: [],
      experience: 0,
      officeHours: '',
      officeLocation: '',
    };
  }

  /**
   * Get student-specific fields
   */
  private async getStudentFields(userId: string): Promise<any> {
    // In a real implementation, you might have a separate StudentProfile table
    return {
      studentId: '',
      year: 1,
      major: '',
      gpa: 0,
      expectedGraduation: null,
    };
  }

  /**
   * Get college admin-specific fields
   */
  private async getCollegeAdminFields(userId: string): Promise<any> {
    return {
      permissions: [],
      department: '',
      responsibilities: [],
    };
  }

  /**
   * Update role-specific fields
   */
  private async updateRoleSpecificFields(
    userId: string,
    updateData: ProfileUpdateData
  ): Promise<void> {
    // In a real implementation, you would update role-specific tables here
    // For now, we'll just log the update
    console.log(`Updating role-specific fields for user ${userId}:`, {
      teacherFields: updateData.teacherFields,
      studentFields: updateData.studentFields,
      collegeAdminFields: updateData.collegeAdminFields,
    });
  }

  /**
   * Validate profile update data
   */
  private async validateProfileUpdate(
    userId: string,
    updateData: ProfileUpdateData
  ): Promise<ProfileValidationResult> {
    const errors: string[] = [];

    // Validate email format
    if (updateData.email && !this.isValidEmail(updateData.email)) {
      errors.push('Invalid email format');
    }

    // Validate phone format
    if (updateData.phone && !this.isValidPhone(updateData.phone)) {
      errors.push('Invalid phone format');
    }

    // Validate role-specific fields
    if (updateData.teacherFields) {
      const teacherValidation = this.validateTeacherFields(updateData.teacherFields);
      errors.push(...teacherValidation.errors);
    }

    if (updateData.studentFields) {
      const studentValidation = this.validateStudentFields(updateData.studentFields);
      errors.push(...studentValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate teacher fields
   */
  private validateTeacherFields(fields: any): ProfileValidationResult {
    const errors: string[] = [];

    if (fields.experience && (fields.experience < 0 || fields.experience > 50)) {
      errors.push('Experience must be between 0 and 50 years');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate student fields
   */
  private validateStudentFields(fields: any): ProfileValidationResult {
    const errors: string[] = [];

    if (fields.gpa && (fields.gpa < 0 || fields.gpa > 4)) {
      errors.push('GPA must be between 0 and 4');
    }

    if (fields.year && (fields.year < 1 || fields.year > 10)) {
      errors.push('Year must be between 1 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}
