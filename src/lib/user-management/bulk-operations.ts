import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { AuditLogger } from '@/lib/security/audit-logger';
import { generateSecureToken } from '@/lib/utils/crypto';
import bcrypt from 'bcryptjs';

export interface BulkImportUser {
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  position?: string;
  phone?: string;
  studentId?: string;
  year?: number;
  major?: string;
  isActive?: boolean;
}

export interface BulkImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  importedUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }>;
}

export interface BulkExportOptions {
  collegeId?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  includeInactive?: boolean;
  format: 'csv' | 'xlsx' | 'json';
}

export interface BulkExportResult {
  success: boolean;
  data: string | Buffer;
  filename: string;
  mimeType: string;
  totalUsers: number;
}

export class BulkOperationsService {
  private prisma: PrismaClient;
  private auditLogger: AuditLogger;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Import users from CSV/Excel data
   */
  async importUsers(
    users: BulkImportUser[],
    collegeId: string,
    importedBy: string,
    options: {
      sendWelcomeEmails?: boolean;
      defaultPassword?: string;
      skipExisting?: boolean;
    } = {}
  ): Promise<BulkImportResult> {
    const {
      sendWelcomeEmails = false,
      defaultPassword = 'TempPassword123!',
      skipExisting = true,
    } = options;

    const result: BulkImportResult = {
      success: true,
      totalRows: users.length,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      importedUsers: [],
    };

    // Validate college exists
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (!college) {
      result.success = false;
      result.errors.push({
        row: 0,
        email: 'system',
        error: 'College not found',
      });
      return result;
    }

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!userData.email || !userData.name || !userData.role) {
          result.errors.push({
            row: rowNumber,
            email: userData.email || 'unknown',
            error: 'Missing required fields (email, name, role)',
          });
          result.failedImports++;
          continue;
        }

        // Validate email format
        if (!this.isValidEmail(userData.email)) {
          result.errors.push({
            row: rowNumber,
            email: userData.email,
            error: 'Invalid email format',
          });
          result.failedImports++;
          continue;
        }

        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          if (skipExisting) {
            result.errors.push({
              row: rowNumber,
              email: userData.email,
              error: 'User already exists (skipped)',
            });
            result.failedImports++;
            continue;
          } else {
            result.errors.push({
              row: rowNumber,
              email: userData.email,
              error: 'User already exists',
            });
            result.failedImports++;
            continue;
          }
        }

        // Validate role
        if (!Object.values(UserRole).includes(userData.role)) {
          result.errors.push({
            row: rowNumber,
            email: userData.email,
            error: 'Invalid role',
          });
          result.failedImports++;
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Create user
        const user = await this.prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            collegeId,
            department: userData.department,
            position: userData.position,
            phone: userData.phone,
            isActive: userData.isActive ?? true,
          },
        });

        result.importedUsers.push({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        result.successfulImports++;

        // Log the import
        await this.auditLogger.logEvent({
          userId: importedBy,
          action: 'USER_BULK_IMPORTED',
          resourceType: 'USER',
          resourceId: user.id,
          details: {
            importedEmail: user.email,
            role: user.role,
            collegeId,
            rowNumber,
          },
          ipAddress: 'system',
          userAgent: 'system',
        });

        // TODO: Send welcome email if requested
        if (sendWelcomeEmails) {
          // This would integrate with the email service
          console.log(`Would send welcome email to ${user.email}`);
        }

      } catch (error) {
        result.errors.push({
          row: rowNumber,
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failedImports++;
      }
    }

    // Log bulk import completion
    await this.auditLogger.logEvent({
      userId: importedBy,
      action: 'USER_BULK_IMPORT_COMPLETED',
      resourceType: 'BULK_OPERATION',
      resourceId: 'bulk-import',
      details: {
        totalRows: result.totalRows,
        successfulImports: result.successfulImports,
        failedImports: result.failedImports,
        collegeId,
      },
      ipAddress: 'system',
      userAgent: 'system',
    });

    return result;
  }

  /**
   * Export users to various formats
   */
  async exportUsers(
    options: BulkExportOptions,
    exportedBy: string
  ): Promise<BulkExportResult> {
    try {
      // Build query filters
      const where: any = {};
      
      if (options.collegeId) {
        where.collegeId = options.collegeId;
      }
      
      if (options.role) {
        where.role = options.role;
      }
      
      if (options.department) {
        where.department = options.department;
      }
      
      if (options.isActive !== undefined) {
        where.isActive = options.isActive;
      } else if (!options.includeInactive) {
        where.isActive = true;
      }

      // Get users
      const users = await this.prisma.user.findMany({
        where,
        include: {
          college: true,
        },
        orderBy: { name: 'asc' },
      });

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `users-export-${timestamp}.${options.format}`;

      let data: string | Buffer;
      let mimeType: string;

      switch (options.format) {
        case 'csv':
          data = this.generateCSV(users);
          mimeType = 'text/csv';
          break;
        case 'xlsx':
          data = await this.generateExcel(users);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'json':
          data = JSON.stringify(users, null, 2);
          mimeType = 'application/json';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Log the export
      await this.auditLogger.logEvent({
        userId: exportedBy,
        action: 'USER_BULK_EXPORTED',
        resourceType: 'BULK_OPERATION',
        resourceId: 'bulk-export',
        details: {
          format: options.format,
          totalUsers: users.length,
          filters: options,
        },
        ipAddress: 'system',
        userAgent: 'system',
      });

      return {
        success: true,
        data,
        filename,
        mimeType,
        totalUsers: users.length,
      };
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate CSV data
   */
  private generateCSV(users: Array<Prisma.UserGetPayload<{ include: { college: true } }>>): string {
    const headers = [
      'ID',
      'Name',
      'Email',
      'Role',
      'Department',
      'Position',
      'Phone',
      'College',
      'Active',
      'Created At',
      'Updated At',
    ];

    const rows = users.map(user => [
      user.id,
      user.name || '',
      user.email,
      user.role,
      user.department || '',
      user.position || '',
      user.phone || '',
      user.college?.name || 'No College',
      user.isActive ? 'Yes' : 'No',
      user.createdAt.toISOString(),
      user.updatedAt.toISOString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Generate Excel data (placeholder - would need xlsx library)
   */
  private async generateExcel(users: Array<Prisma.UserGetPayload<{ include: { college: true } }>>): Promise<Buffer> {
    // This would require installing a library like 'xlsx'
    // For now, return CSV data as buffer
    const csvData = this.generateCSV(users);
    return Buffer.from(csvData, 'utf-8');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get import template
   */
  async getImportTemplate(): Promise<{ data: string; filename: string; mimeType: string }> {
    const templateData = [
      ['email', 'name', 'role', 'department', 'position', 'phone', 'studentId', 'year', 'major', 'isActive'],
      ['john.doe@example.com', 'John Doe', 'STUDENT', 'Computer Science', 'Student', '+1234567890', 'STU001', '2', 'Computer Science', 'true'],
      ['jane.smith@example.com', 'Jane Smith', 'TEACHER', 'Mathematics', 'Professor', '+1234567891', '', '', '', 'true'],
    ];

    const csvContent = templateData
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: 'user-import-template.csv',
      mimeType: 'text/csv',
    };
  }

  /**
   * Validate import data
   */
  async validateImportData(users: BulkImportUser[]): Promise<{
    isValid: boolean;
    errors: Array<{
      row: number;
      email: string;
      error: string;
    }>;
  }> {
    const errors: Array<{
      row: number;
      email: string;
      error: string;
    }> = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const rowNumber = i + 1;

      // Check required fields
      if (!userData.email || !userData.name || !userData.role) {
        errors.push({
          row: rowNumber,
          email: userData.email || 'unknown',
          error: 'Missing required fields (email, name, role)',
        });
        continue;
      }

      // Validate email format
      if (!this.isValidEmail(userData.email)) {
        errors.push({
          row: rowNumber,
          email: userData.email,
          error: 'Invalid email format',
        });
        continue;
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        errors.push({
          row: rowNumber,
          email: userData.email,
          error: 'User already exists',
        });
        continue;
      }

      // Validate role
      if (!Object.values(UserRole).includes(userData.role)) {
        errors.push({
          row: rowNumber,
          email: userData.email,
          error: 'Invalid role',
        });
        continue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
