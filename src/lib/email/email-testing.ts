import { PrismaClient } from '@prisma/client';
import { EmailService, EmailTemplate } from './email-service';
import { NotificationPreferencesService } from './notification-preferences';

export interface EmailTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface EmailValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EmailTestSuite {
  name: string;
  tests: EmailTest[];
  results: EmailTestResult[];
  passed: number;
  failed: number;
  total: number;
}

export interface EmailTest {
  name: string;
  description: string;
  test: () => Promise<EmailTestResult>;
}

export class EmailTestingService {
  private emailService: EmailService;
  private preferencesService: NotificationPreferencesService;
  private prisma: PrismaClient;

  constructor(
    emailService: EmailService,
    preferencesService: NotificationPreferencesService,
    prisma: PrismaClient
  ) {
    this.emailService = emailService;
    this.preferencesService = preferencesService;
    this.prisma = prisma;
  }

  /**
   * Validate email address format
   */
  validateEmailAddress(email: string): EmailValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      errors.push('Email address is required');
    } else if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    } else if (email.length > 254) {
      errors.push('Email address is too long (max 254 characters)');
    } else if (email.includes('..')) {
      errors.push('Email address contains consecutive dots');
    } else if (email.startsWith('.') || email.endsWith('.')) {
      errors.push('Email address cannot start or end with a dot');
    }

    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'temp-mail.org', 'throwaway.email'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && disposableDomains.includes(domain)) {
      warnings.push('Email appears to be from a disposable email service');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate email template
   */
  validateEmailTemplate(template: EmailTemplate): EmailValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!template.to) {
      errors.push('Recipient email is required');
    } else {
      const emailValidation = this.validateEmailAddress(template.to);
      errors.push(...emailValidation.errors);
      warnings.push(...emailValidation.warnings);
    }

    if (!template.subject) {
      errors.push('Email subject is required');
    } else if (template.subject.length > 78) {
      warnings.push('Email subject is longer than recommended (78 characters)');
    }

    if (!template.html) {
      errors.push('HTML content is required');
    } else if (template.html.length < 100) {
      warnings.push('HTML content seems too short');
    }

    // Check for common issues
    if (template.html && !template.html.includes('<!DOCTYPE html>') && !template.html.includes('<html')) {
      warnings.push('HTML content may not be properly formatted');
    }

    if (template.html && template.html.includes('javascript:')) {
      errors.push('HTML content contains potentially dangerous JavaScript');
    }

    if (template.html && !template.text) {
      warnings.push('Plain text version not provided (recommended for accessibility)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Test email service connection
   */
  async testEmailConnection(): Promise<EmailTestResult> {
    try {
      const isConnected = await this.emailService.verifyConnection();
      
      if (isConnected) {
        return {
          success: true,
          message: 'Email service connection successful',
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: 'Email service connection failed',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Email service connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test email sending with mock data
   */
  async testEmailSending(testEmail?: string): Promise<EmailTestResult> {
    try {
      const testRecipient = testEmail || 'test@example.com';
      
      const testTemplate: EmailTemplate = {
        to: testRecipient,
        subject: 'Test Email - Email Service Validation',
        html: `
          <html>
            <body>
              <h1>Test Email</h1>
              <p>This is a test email to validate the email service functionality.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </body>
          </html>
        `,
        text: 'This is a test email to validate the email service functionality.',
        template: 'test',
        metadata: { test: true },
      };

      const result = await this.emailService.sendEmail(testTemplate);
      
      return {
        success: true,
        message: 'Test email sent successfully',
        details: { messageId: result.messageId },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Test email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test email templates rendering
   */
  async testEmailTemplates(): Promise<EmailTestResult> {
    try {
      const testData = {
        userName: 'Test User',
        collegeName: 'Test College',
        role: 'STUDENT',
        invitationToken: 'test-token-123',
        resetToken: 'test-reset-token-123',
        verificationToken: 'test-verification-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        inviterName: 'Test Inviter',
        inviterEmail: 'inviter@test.com',
        loginUrl: 'https://test.example.com/login',
      };

      // Test invitation email
      await this.emailService.sendInvitationEmail({
        to: 'test@example.com',
        inviterName: testData.inviterName,
        inviterEmail: testData.inviterEmail,
        collegeName: testData.collegeName,
        role: testData.role,
        invitationToken: testData.invitationToken,
        expiresAt: testData.expiresAt,
      });

      // Test welcome email
      await this.emailService.sendWelcomeEmail({
        to: 'test@example.com',
        userName: testData.userName,
        collegeName: testData.collegeName,
        role: testData.role,
        loginUrl: testData.loginUrl,
      });

      // Test password reset email
      await this.emailService.sendPasswordResetEmail({
        to: 'test@example.com',
        userName: testData.userName,
        resetToken: testData.resetToken,
        expiresAt: testData.expiresAt,
      });

      // Test email verification email
      await this.emailService.sendEmailVerificationEmail({
        to: 'test@example.com',
        userName: testData.userName,
        verificationToken: testData.verificationToken,
        expiresAt: testData.expiresAt,
        collegeName: testData.collegeName,
      });

      return {
        success: true,
        message: 'All email templates rendered successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Email template testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test notification preferences system
   */
  async testNotificationPreferences(): Promise<EmailTestResult> {
    try {
      // Test getting default preferences for each role
      const roles = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT'] as const;
      
      for (const role of roles) {
        const defaultPrefs = this.preferencesService.getDefaultPreferences(role);
        
        if (!defaultPrefs) {
          throw new Error(`Failed to get default preferences for role: ${role}`);
        }
      }

      return {
        success: true,
        message: 'Notification preferences system working correctly',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Notification preferences testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting(): Promise<EmailTestResult> {
    try {
      const testEmail = 'ratelimit-test@example.com';
      const promises: Promise<any>[] = [];

      // Send multiple emails quickly to test rate limiting
      for (let i = 0; i < 5; i++) {
        promises.push(
          this.emailService.sendEmail({
            to: testEmail,
            subject: `Rate Limit Test ${i + 1}`,
            html: `<p>Rate limit test email ${i + 1}</p>`,
            template: 'rate-limit-test',
          }).catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        return {
          success: true,
          message: 'Rate limiting is working (some emails were blocked)',
          details: { blockedEmails: errors.length, totalEmails: results.length },
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: 'Rate limiting may not be working properly (all emails sent)',
          details: { totalEmails: results.length },
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Rate limiting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run comprehensive email test suite
   */
  async runTestSuite(testEmail?: string): Promise<EmailTestSuite> {
    const tests: EmailTest[] = [
      {
        name: 'Email Connection Test',
        description: 'Test email service connection',
        test: () => this.testEmailConnection(),
      },
      {
        name: 'Email Template Validation',
        description: 'Validate email template rendering',
        test: () => this.testEmailTemplates(),
      },
      {
        name: 'Email Sending Test',
        description: 'Test sending actual emails',
        test: () => this.testEmailSending(testEmail),
      },
      {
        name: 'Notification Preferences Test',
        description: 'Test notification preferences system',
        test: () => this.testNotificationPreferences(),
      },
      {
        name: 'Rate Limiting Test',
        description: 'Test email rate limiting functionality',
        test: () => this.testRateLimiting(),
      },
    ];

    const results: EmailTestResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.test();
        results.push(result);
        
        if (result.success) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        const errorResult: EmailTestResult = {
          success: false,
          message: `Test "${test.name}" threw an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error,
          timestamp: new Date(),
        };
        results.push(errorResult);
        failed++;
      }
    }

    return {
      name: 'Email Integration Test Suite',
      tests,
      results,
      passed,
      failed,
      total: tests.length,
    };
  }

  /**
   * Generate test report
   */
  generateTestReport(testSuite: EmailTestSuite): string {
    const report = `
# Email Integration Test Report

**Test Suite:** ${testSuite.name}
**Date:** ${new Date().toISOString()}
**Total Tests:** ${testSuite.total}
**Passed:** ${testSuite.passed}
**Failed:** ${testSuite.failed}
**Success Rate:** ${((testSuite.passed / testSuite.total) * 100).toFixed(1)}%

## Test Results

${testSuite.results.map((result, index) => `
### ${index + 1}. ${testSuite.tests[index].name}
**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}
**Message:** ${result.message}
**Timestamp:** ${result.timestamp.toISOString()}
${result.details ? `**Details:** \`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`` : ''}
`).join('\n')}

## Summary

${testSuite.passed === testSuite.total 
  ? '🎉 All tests passed! Email integration is working correctly.'
  : `⚠️ ${testSuite.failed} test(s) failed. Please review the issues above.`
}
`;

    return report;
  }
}
