import { PrismaClient } from '@prisma/client';

export interface EmailTemplateData {
  id?: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  type: 'transactional' | 'notification' | 'marketing';
  status: 'active' | 'inactive' | 'draft';
  variables: string[]; // Template variables like {userName}, {collegeName}
  language: string;
  collegeId?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  metadata?: Record<string, any>;
}

export interface EmailTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  htmlContent: string;
  textContent?: string;
  subject: string;
  variables: string[];
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

export class EmailTemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new email template
   */
  async createTemplate(templateData: EmailTemplateData, createdBy: string): Promise<EmailTemplateData> {
    try {
      // For now, we'll store templates in memory since we don't have a template table
      // In a real implementation, this would be stored in the database
      const templateId = `template_${Date.now()}`;
      const { id: _, ...restTemplateData } = templateData; // Exclude id from spread
      const template: EmailTemplateData = {
        ...restTemplateData,
        id: templateId,
        status: templateData.status || 'draft'
      };

      // Store in memory (replace with database storage)
      if (!(global as any).emailTemplates) {
        (global as any).emailTemplates = new Map<string, EmailTemplateData>();
      }
      (global as any).emailTemplates.set(String(template.id), template);

      return template;
    } catch (error) {
      console.error('Error creating email template:', error);
      throw new Error('Failed to create email template');
    }
  }

  /**
   * Get all email templates
   */
  async getTemplates(collegeId?: string, type?: string): Promise<EmailTemplateData[]> {
    try {
      // For now, return mock data since we don't have a template table
      // In a real implementation, this would query the database
      const mockTemplates: EmailTemplateData[] = [
        {
          id: '1',
          name: 'Welcome Email',
          subject: 'Welcome to {collegeName}!',
          htmlContent: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Welcome</title>
              </head>
              <body>
                <h1>Welcome to {collegeName}!</h1>
                <p>Hello {userName},</p>
                <p>Welcome to our platform. We're excited to have you on board!</p>
                <p>Best regards,<br>The {collegeName} Team</p>
              </body>
            </html>
          `,
          textContent: 'Welcome to {collegeName}! Hello {userName}, Welcome to our platform.',
          type: 'transactional',
          status: 'active',
          variables: ['userName', 'collegeName'],
          language: 'en',
          branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#1F2937',
            fontFamily: 'Arial, sans-serif'
          }
        },
        {
          id: '2',
          name: 'Password Reset',
          subject: 'Password Reset Request',
          htmlContent: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Password Reset</title>
              </head>
              <body>
                <h1>Password Reset Request</h1>
                <p>Hello {userName},</p>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="{resetUrl}">Reset Password</a>
                <p>This link expires in {expiresIn}.</p>
                <p>If you didn't request this, please ignore this email.</p>
              </body>
            </html>
          `,
          textContent: 'Password Reset Request. Hello {userName}, Click {resetUrl} to reset your password.',
          type: 'transactional',
          status: 'active',
          variables: ['userName', 'resetUrl', 'expiresIn'],
          language: 'en',
          branding: {
            primaryColor: '#EF4444',
            secondaryColor: '#1F2937',
            fontFamily: 'Arial, sans-serif'
          }
        },
        {
          id: '3',
          name: 'Exam Results',
          subject: 'Your exam results are ready',
          htmlContent: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Exam Results</title>
              </head>
              <body>
                <h1>Exam Results Available</h1>
                <p>Hello {userName},</p>
                <p>Your results for {examName} are now available.</p>
                <p>Score: {score}/{totalScore}</p>
                <p>Grade: {grade}</p>
                <p>View your detailed results in your dashboard.</p>
              </body>
            </html>
          `,
          textContent: 'Exam Results Available. Hello {userName}, Your results for {examName} are ready.',
          type: 'notification',
          status: 'active',
          variables: ['userName', 'examName', 'score', 'totalScore', 'grade'],
          language: 'en',
          branding: {
            primaryColor: '#10B981',
            secondaryColor: '#1F2937',
            fontFamily: 'Arial, sans-serif'
          }
        }
      ];

      let filteredTemplates = mockTemplates;

      if (collegeId) {
        // Filter by college if needed
        filteredTemplates = filteredTemplates.filter(t => !t.collegeId || t.collegeId === collegeId);
      }

      if (type && type !== 'all') {
        filteredTemplates = filteredTemplates.filter(t => t.type === type);
      }

      return filteredTemplates;
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw new Error('Failed to fetch email templates');
    }
  }

  /**
   * Get a specific email template by ID
   */
  async getTemplateById(templateId: string): Promise<EmailTemplateData | null> {
    try {
      // For now, return mock data
      const mockTemplates = await this.getTemplates();
      return mockTemplates.find(t => t.id === templateId) || null;
    } catch (error) {
      console.error('Error fetching template by ID:', error);
      throw new Error('Failed to fetch template');
    }
  }

  /**
   * Update an email template
   */
  async updateTemplate(templateId: string, updates: Partial<EmailTemplateData>): Promise<EmailTemplateData> {
    try {
      // For now, update in memory
      if ((global as any).emailTemplates && (global as any).emailTemplates.has(templateId)) {
        const existingTemplate = (global as any).emailTemplates.get(templateId) as EmailTemplateData | undefined;
        if (existingTemplate) {
          const updatedTemplate: EmailTemplateData = { ...existingTemplate, ...updates };
          (global as any).emailTemplates.set(templateId, updatedTemplate);
          return updatedTemplate;
        }
      }

      throw new Error('Template not found');
    } catch (error) {
      console.error('Error updating email template:', error);
      throw new Error('Failed to update email template');
    }
  }

  /**
   * Delete an email template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      // For now, delete from memory
      if ((global as any).emailTemplates && (global as any).emailTemplates.has(templateId)) {
        (global as any).emailTemplates.delete(templateId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting email template:', error);
      throw new Error('Failed to delete email template');
    }
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: EmailTemplateData, variables: Record<string, any>): {
    subject: string;
    htmlContent: string;
    textContent?: string;
  } {
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    // Replace variables in subject and content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      subject = subject.replace(regex, String(value));
      htmlContent = htmlContent.replace(regex, String(value));
      if (textContent) {
        textContent = textContent.replace(regex, String(value));
      }
    });

    return {
      subject,
      htmlContent,
      textContent
    };
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(template: EmailTemplateData, variables: Record<string, any>): {
    isValid: boolean;
    missing: string[];
    extra: string[];
  } {
    const requiredVariables = template.variables || [];
    const providedVariables = Object.keys(variables);
    
    const missing = requiredVariables.filter(v => !providedVariables.includes(v));
    const extra = providedVariables.filter(v => !requiredVariables.includes(v));
    
    return {
      isValid: missing.length === 0,
      missing,
      extra
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(templateId: string): Promise<{
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }> {
    try {
      // Query email logs for this template
      const [totalSent, delivered, opened, clicked] = await Promise.all([
        this.prisma.emailLog.count({ where: { template: templateId } }),
        this.prisma.emailLog.count({ where: { template: templateId, status: 'DELIVERED' } }),
        this.prisma.emailLog.count({ where: { template: templateId, status: 'OPENED' } }),
        this.prisma.emailLog.count({ where: { template: templateId, status: 'CLICKED' } })
      ]);

      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

      return {
        totalSent,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting template usage stats:', error);
      return {
        totalSent: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0
      };
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(templateId: string, newName: string, createdBy: string): Promise<EmailTemplateData> {
    try {
      const originalTemplate = await this.getTemplateById(templateId);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      const duplicatedTemplateId = `template_${Date.now()}`;
      const { id: _, ...restOriginalTemplate } = originalTemplate; // Exclude id from spread
      const duplicatedTemplate: EmailTemplateData = {
        ...restOriginalTemplate,
        id: duplicatedTemplateId,
        name: newName,
        status: 'draft'
      };

      // Store the duplicated template
      if (!(global as any).emailTemplates) {
        (global as any).emailTemplates = new Map<string, EmailTemplateData>();
      }
      (global as any).emailTemplates.set(String(duplicatedTemplate.id), duplicatedTemplate);

      return duplicatedTemplate;
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw new Error('Failed to duplicate template');
    }
  }

  /**
   * Get template categories and types
   */
  async getTemplateCategories(): Promise<{
    types: string[];
    languages: string[];
    statuses: string[];
  }> {
    return {
      types: ['transactional', 'notification', 'marketing'],
      languages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
      statuses: ['active', 'inactive', 'draft']
    };
  }
}

// Global type declaration for email templates storage
declare global {
  var emailTemplates: Map<string, EmailTemplateData> | undefined;
}
