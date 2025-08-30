import { PrismaClient, Prisma, UserRole, College } from '@prisma/client';
import { getEmailService } from '@/lib/email/email-service';
import { generateSecureToken } from '@/lib/utils/crypto';
import { AuditLogger } from '@/lib/security/audit-logger';

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  collegeId: string;
  invitedBy: string;
  expiresInHours?: number;
  customMessage?: string;
}

export interface InvitationWithDetails {
  id: string;
  email: string;
  role: UserRole;
  collegeId: string;
  invitedBy: string;
  invitationToken: string;
  expiresAt: Date;
  status: string;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  resendCount: number;
  lastResentAt: Date | null;
  customMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  college: College | null;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
}

export class InvitationService {
  private prisma: PrismaClient;
  private emailService: ReturnType<typeof getEmailService>;
  private auditLogger: AuditLogger;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.emailService = getEmailService();
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Create and send user invitation
   */
  async createInvitation(data: CreateInvitationData): Promise<Prisma.UserInvitationGetPayload<{}>> {
    const { email, role, collegeId, invitedBy, expiresInHours = 72, customMessage } = data;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email,
        collegeId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new Error('A pending invitation already exists for this email');
    }

    // Generate secure invitation token
    const invitationToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Create invitation
    const invitation = await this.prisma.userInvitation.create({
      data: {
        email,
        role,
        collegeId,
        invitedBy,
        invitationToken,
        expiresAt,
        status: 'PENDING',
        customMessage,
      },
      include: {
        college: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send invitation email
    try {
      await this.emailService.sendInvitationEmail({
        to: email,
        inviterName: invitation.inviter.name || invitation.inviter.email,
        inviterEmail: invitation.inviter.email,
        collegeName: invitation.college?.name || 'Unknown College',
        role,
        invitationToken,
        expiresAt,
      });

      // Log successful invitation
      await this.auditLogger.logEvent({
        userId: invitedBy,
        action: 'USER_INVITATION_SENT',
        resourceType: 'USER_INVITATION',
        resourceId: invitation.id,
        details: {
          invitedEmail: email,
          role,
          collegeId,
        },
        ipAddress: 'system',
        userAgent: 'system',
      });
    } catch (error) {
      // If email fails, mark invitation as failed
      await this.prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'FAILED' },
      });

      await this.auditLogger.logEvent({
        userId: invitedBy,
        action: 'USER_INVITATION_FAILED',
        resourceType: 'USER_INVITATION',
        resourceId: invitation.id,
        details: {
          invitedEmail: email,
          role,
          collegeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress: 'system',
        userAgent: 'system',
      });

      throw new Error('Failed to send invitation email');
    }

    return invitation;
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(
    invitationToken: string,
    userData: {
      name: string;
      password: string;
    }
  ): Promise<Prisma.UserGetPayload<{}>> {
    // Find and validate invitation
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { invitationToken },
      include: {
        college: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== 'PENDING') {
      throw new Error('Invitation has already been used or expired');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Check if user already exists (double-check)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user account
    const user = await this.prisma.user.create({
      data: {
        name: invitation.email, // UserInvitation doesn't have a name field, use email
        email: invitation.email,
        password: userData.password, // Should be hashed by the calling function
        role: invitation.role,
        collegeId: invitation.collegeId,
        isActive: true,
      },
    });

    // Mark invitation as accepted
    await this.prisma.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: user.id,
      },
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        userName: user.name || user.email,
        collegeName: invitation.college?.name || 'Unknown College',
        role: user.role,
        loginUrl: `${process.env.NEXTAUTH_URL}/auth/signin`,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the invitation acceptance if welcome email fails
    }

    // Log invitation acceptance
    await this.auditLogger.logEvent({
      userId: user.id,
      action: 'USER_INVITATION_ACCEPTED',
      resourceType: 'USER_INVITATION',
      resourceId: invitation.id,
      details: {
        invitedBy: invitation.invitedBy,
        role: user.role,
        collegeId: user.collegeId!,
      },
      ipAddress: 'system',
      userAgent: 'system',
    });

    return user;
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(invitationId: string, invitedBy: string): Promise<void> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id: invitationId },
      include: {
        college: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new Error('Can only resend pending invitations');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    try {
      await this.emailService.sendInvitationEmail({
        to: invitation.email,
        inviterName: invitation.inviter.name || invitation.inviter.email,
        inviterEmail: invitation.inviter.email,
        collegeName: invitation.college?.name || 'Unknown College',
        role: invitation.role,
        invitationToken: invitation.invitationToken,
        expiresAt: invitation.expiresAt,
      });

      // Update resend count
      await this.prisma.userInvitation.update({
        where: { id: invitationId },
        data: {
          resendCount: invitation.resendCount + 1,
          lastResentAt: new Date(),
        },
      });

      // Log resend
      await this.auditLogger.logEvent({
        userId: invitedBy,
        action: 'USER_INVITATION_RESENT',
        resourceType: 'USER_INVITATION',
        resourceId: invitationId,
        details: {
          invitedEmail: invitation.email,
          resendCount: invitation.resendCount + 1,
        },
        ipAddress: 'system',
        userAgent: 'system',
      });
    } catch (error) {
      throw new Error('Failed to resend invitation email');
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, cancelledBy: string): Promise<void> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new Error('Can only cancel pending invitations');
    }

    await this.prisma.userInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy,
      },
    });

    // Log cancellation
    await this.auditLogger.logEvent({
      userId: cancelledBy,
      action: 'USER_INVITATION_CANCELLED',
      resourceType: 'USER_INVITATION',
      resourceId: invitationId,
      details: {
        invitedEmail: invitation.email,
        role: invitation.role,
      },
      ipAddress: 'system',
      userAgent: 'system',
    });
  }

  /**
   * Get invitations for a college
   */
  async getCollegeInvitations(
    collegeId: string,
    options: {
      status?: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'FAILED';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ invitations: InvitationWithDetails[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    const where = {
      collegeId,
      ...(status && { status }),
    } as const;

    const [invitations, total] = await Promise.all([
      this.prisma.userInvitation.findMany({
        where,
        include: {
          college: true,
          inviter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.userInvitation.count({ where }),
    ]);

    return { invitations: invitations as unknown as InvitationWithDetails[], total };
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
    return (this.prisma.userInvitation.findUnique({
      where: { invitationToken: token },
      include: {
        college: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }) as unknown) as Promise<InvitationWithDetails | null>;
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.prisma.userInvitation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }
}
