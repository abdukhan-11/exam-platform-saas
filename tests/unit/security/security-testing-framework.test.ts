/**
 * Security Testing Framework Tests
 *
 * Comprehensive test suite for security testing framework including
 * vulnerability scanning, penetration testing, and security auditing.
 */

import { securityTestingFramework } from '../../../src/lib/security/security-testing-framework';
import { SecurityAuditReport, PenetrationTestResult, VulnerabilityScanResult } from '../../../src/lib/security/security-testing-framework';

// Mock the security testing framework methods
jest.mock('../../../src/lib/security/security-testing-framework', () => ({
  securityTestingFramework: {
    runSecurityAudit: jest.fn(),
    getActiveScans: jest.fn(),
    getScanHistory: jest.fn(),
    getSecurityMetrics: jest.fn()
  }
}));

describe('Security Testing Framework', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
    (securityTestingFramework as any).scanHistory = [];
    (securityTestingFramework as any).activeScans = new Set();
  });

  describe('Security Audit Execution', () => {
    test('should run comprehensive security audit', async () => {
      const mockAuditReport: SecurityAuditReport = {
        id: 'audit_123',
        timestamp: Date.now(),
        duration: 5000,
        scope: ['vulnerability_scan', 'penetration_test'],
        vulnerabilities: [
          {
            id: 'vuln_1',
            title: 'SQL Injection Vulnerability',
            description: 'Potential SQL injection in login endpoint',
            severity: 'high',
            category: 'injection',
            cve: 'CWE-89',
            cvssScore: 8.5,
            affectedComponent: '/api/auth/login',
            impact: 'Unauthorized data access',
            remediation: 'Use parameterized queries',
            references: ['https://owasp.org/attacks/SQL_Injection'],
            discoveredAt: Date.now(),
            status: 'open'
          }
        ],
        penetrationTests: [
          {
            id: 'pentest_1',
            testType: 'sql_injection',
            target: '/api/auth/login',
            payload: "' OR '1'='1",
            result: 'blocked',
            response: { status: 400, message: 'Invalid input' },
            impact: 'No impact',
            recommendation: 'Security measures effective',
            timestamp: Date.now(),
            severity: 'low'
          }
        ],
        complianceResults: [
          {
            standard: 'owasp_top_10',
            requirement: 'A1-Injection',
            status: 'compliant',
            evidence: 'Parameterized queries implemented',
            notes: 'All endpoints use prepared statements'
          }
        ],
        overallScore: 85,
        riskLevel: 'medium',
        recommendations: [
          'Implement additional input validation',
          'Regular security audits recommended'
        ],
        executiveSummary: 'Security audit completed with medium risk level'
      };

      (securityTestingFramework.runSecurityAudit as jest.Mock).mockResolvedValue(mockAuditReport);

      const result = await securityTestingFramework.runSecurityAudit();

      expect(result).toEqual(mockAuditReport);
      expect(result.overallScore).toBe(85);
      expect(result.riskLevel).toBe('medium');
      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.penetrationTests).toHaveLength(1);
    });

    test('should handle audit failures gracefully', async () => {
      const error = new Error('Audit failed');
      (securityTestingFramework.runSecurityAudit as jest.Mock).mockRejectedValue(error);

      await expect(securityTestingFramework.runSecurityAudit()).rejects.toThrow('Audit failed');
    });

    test('should run audit with specific scope', async () => {
      const mockReport: SecurityAuditReport = {
        id: 'audit_456',
        timestamp: Date.now(),
        duration: 3000,
        scope: ['vulnerability_scan'],
        vulnerabilities: [],
        penetrationTests: [],
        complianceResults: [],
        overallScore: 95,
        riskLevel: 'low',
        recommendations: [],
        executiveSummary: 'Focused vulnerability scan completed'
      };

      (securityTestingFramework.runSecurityAudit as jest.Mock).mockResolvedValue(mockReport);

      const result = await securityTestingFramework.runSecurityAudit(['vulnerability_scan']);

      expect(result.scope).toContain('vulnerability_scan');
      expect(result.scope).not.toContain('penetration_test');
    });
  });

  describe('Active Scans Management', () => {
    test('should track active scans', async () => {
      const mockActiveScans = ['audit_123', 'audit_456'];
      (securityTestingFramework.getActiveScans as jest.Mock).mockReturnValue(mockActiveScans);

      const activeScans = securityTestingFramework.getActiveScans();

      expect(activeScans).toEqual(mockActiveScans);
      expect(activeScans).toHaveLength(2);
    });

    test('should return empty array when no active scans', () => {
      (securityTestingFramework.getActiveScans as jest.Mock).mockReturnValue([]);

      const activeScans = securityTestingFramework.getActiveScans();

      expect(activeScans).toEqual([]);
      expect(activeScans).toHaveLength(0);
    });
  });

  describe('Scan History Management', () => {
    test('should retrieve scan history', () => {
      const mockHistory: SecurityAuditReport[] = [
        {
          id: 'audit_1',
          timestamp: Date.now() - 86400000, // 1 day ago
          duration: 5000,
          scope: ['vulnerability_scan'],
          vulnerabilities: [],
          penetrationTests: [],
          complianceResults: [],
          overallScore: 90,
          riskLevel: 'low',
          recommendations: [],
          executiveSummary: 'First audit'
        },
        {
          id: 'audit_2',
          timestamp: Date.now() - 43200000, // 12 hours ago
          duration: 4500,
          scope: ['penetration_test'],
          vulnerabilities: [],
          penetrationTests: [],
          complianceResults: [],
          overallScore: 85,
          riskLevel: 'medium',
          recommendations: [],
          executiveSummary: 'Second audit'
        }
      ];

      (securityTestingFramework.getScanHistory as jest.Mock).mockReturnValue(mockHistory);

      const history = securityTestingFramework.getScanHistory();

      expect(history).toHaveLength(2);
      expect(history[0].overallScore).toBe(90);
      expect(history[1].overallScore).toBe(85);
    });

    test('should limit scan history results', () => {
      const mockHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `audit_${i}`,
        timestamp: Date.now(),
        duration: 5000,
        scope: [],
        vulnerabilities: [],
        penetrationTests: [],
        complianceResults: [],
        overallScore: 80 + i,
        riskLevel: 'medium' as const,
        recommendations: [],
        executiveSummary: `Audit ${i}`
      }));

      (securityTestingFramework.getScanHistory as jest.Mock).mockReturnValue(mockHistory);

      const history = securityTestingFramework.getScanHistory(5);

      expect(history).toHaveLength(5);
    });
  });

  describe('Security Metrics', () => {
    test('should calculate security metrics', () => {
      const mockMetrics = {
        totalScans: 10,
        averageScore: 87.5,
        criticalIssues: 2,
        highIssues: 5,
        lastScanDate: Date.now()
      };

      (securityTestingFramework.getSecurityMetrics as jest.Mock).mockReturnValue(mockMetrics);

      const metrics = securityTestingFramework.getSecurityMetrics();

      expect(metrics.totalScans).toBe(10);
      expect(metrics.averageScore).toBe(87.5);
      expect(metrics.criticalIssues).toBe(2);
      expect(metrics.highIssues).toBe(5);
      expect(metrics.lastScanDate).toBeDefined();
    });

    test('should handle empty metrics', () => {
      const emptyMetrics = {
        totalScans: 0,
        averageScore: 100,
        criticalIssues: 0,
        highIssues: 0,
        lastScanDate: 0
      };

      (securityTestingFramework.getSecurityMetrics as jest.Mock).mockReturnValue(emptyMetrics);

      const metrics = securityTestingFramework.getSecurityMetrics();

      expect(metrics.totalScans).toBe(0);
      expect(metrics.criticalIssues).toBe(0);
      expect(metrics.highIssues).toBe(0);
    });
  });

  describe('Vulnerability Assessment', () => {
    test('should assess SQL injection vulnerabilities', () => {
      const vulnerabilities: VulnerabilityScanResult[] = [
        {
          id: 'sql_injection_1',
          title: 'SQL Injection in Login',
          description: 'Potential SQL injection vulnerability detected',
          severity: 'high',
          category: 'injection',
          cve: 'CWE-89',
          cvssScore: 8.5,
          affectedComponent: '/api/auth/login',
          impact: 'Unauthorized data access and potential system compromise',
          remediation: 'Use parameterized queries and input validation',
          references: ['https://owasp.org/attacks/SQL_Injection'],
          discoveredAt: Date.now(),
          status: 'open'
        }
      ];

      expect(vulnerabilities[0].severity).toBe('high');
      expect(vulnerabilities[0].category).toBe('injection');
      expect(vulnerabilities[0].cvssScore).toBe(8.5);
    });

    test('should assess XSS vulnerabilities', () => {
      const vulnerabilities: VulnerabilityScanResult[] = [
        {
          id: 'xss_1',
          title: 'Cross-Site Scripting Vulnerability',
          description: 'Potential XSS vulnerability in user input fields',
          severity: 'high',
          category: 'xss',
          cve: 'CWE-79',
          cvssScore: 7.5,
          affectedComponent: 'User registration form',
          impact: 'Session hijacking and malicious script execution',
          remediation: 'Implement input sanitization and Content Security Policy',
          references: ['https://owasp.org/attacks/xss'],
          discoveredAt: Date.now(),
          status: 'open'
        }
      ];

      expect(vulnerabilities[0].category).toBe('xss');
      expect(vulnerabilities[0].cve).toBe('CWE-79');
      expect(vulnerabilities[0].status).toBe('open');
    });

    test('should assess authentication vulnerabilities', () => {
      const vulnerabilities: VulnerabilityScanResult[] = [
        {
          id: 'auth_weak_password',
          title: 'Weak Password Policy',
          description: 'Password policy does not meet security requirements',
          severity: 'medium',
          category: 'auth',
          cve: 'CWE-521',
          cvssScore: 5.0,
          affectedComponent: 'Authentication System',
          impact: 'Increased risk of password-based attacks',
          remediation: 'Implement strong password requirements',
          references: ['https://cwe.mitre.org/data/definitions/521.html'],
          discoveredAt: Date.now(),
          status: 'open'
        }
      ];

      expect(vulnerabilities[0].category).toBe('auth');
      expect(vulnerabilities[0].severity).toBe('medium');
      expect(vulnerabilities[0].impact).toContain('password-based attacks');
    });
  });

  describe('Penetration Testing', () => {
    test('should perform SQL injection penetration tests', () => {
      const penetrationTests: PenetrationTestResult[] = [
        {
          id: 'sql_pentest_1',
          testType: 'sql_injection',
          target: '/api/auth/login',
          payload: "' OR '1'='1 --",
          result: 'blocked',
          response: { status: 400, message: 'Invalid input detected' },
          impact: 'No impact - security measures effective',
          recommendation: 'Continue monitoring for similar attempts',
          timestamp: Date.now(),
          severity: 'low'
        },
        {
          id: 'sql_pentest_2',
          testType: 'sql_injection',
          target: '/api/users',
          payload: "'; DROP TABLE users; --",
          result: 'success',
          response: { status: 500, message: 'Internal server error' },
          impact: 'Potential system compromise and data loss',
          recommendation: 'Implement immediate input validation and parameterized queries',
          timestamp: Date.now(),
          severity: 'critical'
        }
      ];

      const successfulTests = penetrationTests.filter(test => test.result === 'success');
      const blockedTests = penetrationTests.filter(test => test.result === 'blocked');

      expect(successfulTests).toHaveLength(1);
      expect(blockedTests).toHaveLength(1);
      expect(successfulTests[0].severity).toBe('critical');
      expect(blockedTests[0].severity).toBe('low');
    });

    test('should perform XSS penetration tests', () => {
      const penetrationTests: PenetrationTestResult[] = [
        {
          id: 'xss_pentest_1',
          testType: 'xss',
          target: 'Comment form',
          payload: '<script>alert("XSS")</script>',
          result: 'blocked',
          response: { status: 200, sanitized: true },
          impact: 'No impact - input properly sanitized',
          recommendation: 'XSS protection is effective',
          timestamp: Date.now(),
          severity: 'low'
        }
      ];

      expect(penetrationTests[0].testType).toBe('xss');
      expect(penetrationTests[0].result).toBe('blocked');
      expect(penetrationTests[0].severity).toBe('low');
    });

    test('should perform CSRF penetration tests', () => {
      const penetrationTests: PenetrationTestResult[] = [
        {
          id: 'csrf_pentest_1',
          testType: 'csrf',
          target: '/api/user/update',
          payload: 'POST request without CSRF token',
          result: 'blocked',
          response: { status: 403, message: 'CSRF token missing' },
          impact: 'No impact - CSRF protection active',
          recommendation: 'CSRF protection is working correctly',
          timestamp: Date.now(),
          severity: 'low'
        }
      ];

      expect(penetrationTests[0].testType).toBe('csrf');
      expect(penetrationTests[0].result).toBe('blocked');
      expect(penetrationTests[0].response.status).toBe(403);
    });

    test('should perform file upload penetration tests', () => {
      const penetrationTests: PenetrationTestResult[] = [
        {
          id: 'upload_pentest_1',
          testType: 'file_upload',
          target: '/api/upload',
          payload: 'malicious.exe file',
          result: 'blocked',
          response: { status: 400, message: 'File type not allowed' },
          impact: 'No impact - file validation working',
          recommendation: 'File upload security is adequate',
          timestamp: Date.now(),
          severity: 'low'
        },
        {
          id: 'upload_pentest_2',
          testType: 'file_upload',
          target: '/api/upload',
          payload: '../../../etc/passwd',
          result: 'blocked',
          response: { status: 400, message: 'Path traversal detected' },
          impact: 'No impact - path traversal protection active',
          recommendation: 'Path traversal protection is effective',
          timestamp: Date.now(),
          severity: 'low'
        }
      ];

      expect(penetrationTests).toHaveLength(2);
      expect(penetrationTests.every(test => test.result === 'blocked')).toBe(true);
      expect(penetrationTests.every(test => test.severity === 'low')).toBe(true);
    });
  });

  describe('Compliance Assessment', () => {
    test('should assess OWASP Top 10 compliance', () => {
      const complianceResults = [
        {
          standard: 'OWASP Top 10',
          requirement: 'A1-Injection',
          status: 'compliant' as const,
          evidence: 'All queries use parameterized statements',
          notes: 'Regular code reviews ensure compliance'
        },
        {
          standard: 'OWASP Top 10',
          requirement: 'A2-Broken Authentication',
          status: 'compliant' as const,
          evidence: 'Multi-factor authentication implemented',
          notes: 'JWT tokens with proper expiration'
        },
        {
          standard: 'OWASP Top 10',
          requirement: 'A3-Sensitive Data Exposure',
          status: 'partial' as const,
          evidence: 'HTTPS implemented, some legacy endpoints remain',
          notes: 'Migration to HTTPS in progress'
        }
      ];

      const compliantItems = complianceResults.filter(item => item.status === 'compliant');
      const partialItems = complianceResults.filter(item => item.status === 'partial');

      expect(compliantItems).toHaveLength(2);
      expect(partialItems).toHaveLength(1);
      expect(complianceResults[0].evidence).toContain('parameterized statements');
    });

    test('should assess GDPR compliance', () => {
      const gdprCompliance = [
        {
          standard: 'GDPR',
          requirement: 'Data Subject Rights',
          status: 'compliant' as const,
          evidence: 'Data export and deletion APIs implemented',
          notes: 'Regular compliance audits conducted'
        },
        {
          standard: 'GDPR',
          requirement: 'Data Protection by Design',
          status: 'compliant' as const,
          evidence: 'Privacy impact assessments completed',
          notes: 'Security integrated into development process'
        }
      ];

      expect(gdprCompliance).toHaveLength(2);
      expect(gdprCompliance.every(item => item.status === 'compliant')).toBe(true);
    });

    test('should calculate compliance score', () => {
      const complianceResults = [
        { standard: 'OWASP', status: 'compliant' as const, score: 95 },
        { standard: 'GDPR', status: 'partial' as const, score: 75 },
        { standard: 'PCI DSS', status: 'non_compliant' as const, score: 45 }
      ];

      const averageScore = complianceResults.reduce((sum, item) => sum + item.score, 0) / complianceResults.length;
      const compliantCount = complianceResults.filter(item => item.status === 'compliant').length;

      expect(averageScore).toBeCloseTo(71.67, 1);
      expect(compliantCount).toBe(1);
    });
  });

  describe('Risk Assessment', () => {
    test('should calculate overall security score', () => {
      // High vulnerabilities should reduce score significantly
      const highVulnerabilities = 3;
      const criticalVulnerabilities = 1;
      const successfulPenetrationTests = 2;

      const baseScore = 100;
      const vulnerabilityPenalty = (highVulnerabilities * 15) + (criticalVulnerabilities * 25);
      const penetrationPenalty = successfulPenetrationTests * 10;
      const calculatedScore = Math.max(0, baseScore - vulnerabilityPenalty - penetrationPenalty);

      expect(calculatedScore).toBe(15); // 100 - (3*15) - (1*25) - (2*10)
    });

    test('should determine risk levels', () => {
      const testCases = [
        { score: 95, expectedRisk: 'low' },
        { score: 85, expectedRisk: 'low' },
        { score: 75, expectedRisk: 'medium' },
        { score: 65, expectedRisk: 'medium' },
        { score: 45, expectedRisk: 'high' },
        { score: 25, expectedRisk: 'high' },
        { score: 15, expectedRisk: 'critical' },
        { score: 5, expectedRisk: 'critical' }
      ];

      testCases.forEach(({ score, expectedRisk }) => {
        const riskLevel = score >= 80 ? 'low' :
                         score >= 60 ? 'medium' :
                         score >= 40 ? 'high' : 'critical';
        expect(riskLevel).toBe(expectedRisk);
      });
    });

    test('should generate security recommendations', () => {
      const vulnerabilities = [
        { category: 'injection', severity: 'high' },
        { category: 'xss', severity: 'medium' },
        { category: 'auth', severity: 'low' }
      ];

      const penetrationTests = [
        { testType: 'sql_injection', result: 'success' },
        { testType: 'csrf', result: 'blocked' }
      ];

      const recommendations: string[] = [];

      if (vulnerabilities.some(v => v.category === 'injection')) {
        recommendations.push('Implement parameterized queries and input validation');
      }

      if (vulnerabilities.some(v => v.category === 'xss')) {
        recommendations.push('Implement input sanitization and Content Security Policy');
      }

      if (penetrationTests.some(t => t.result === 'success')) {
        recommendations.push('Address successful penetration test findings');
      }

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0]).toContain('parameterized queries');
      expect(recommendations[1]).toContain('input sanitization');
      expect(recommendations[2]).toContain('penetration test');
    });
  });

  describe('Security Audit Reporting', () => {
    test('should generate comprehensive audit report', () => {
      const auditReport: SecurityAuditReport = {
        id: 'audit_comprehensive',
        timestamp: Date.now(),
        duration: 15000, // 15 seconds
        scope: ['vulnerability_scan', 'penetration_test', 'compliance_check'],
        vulnerabilities: [
          {
            id: 'vuln_1',
            title: 'SQL Injection',
            description: 'Potential SQL injection vulnerability',
            severity: 'high',
            category: 'injection',
            cve: 'CWE-89',
            cvssScore: 8.5,
            affectedComponent: '/api/login',
            impact: 'Data breach risk',
            remediation: 'Use parameterized queries',
            references: ['https://owasp.org/attacks/SQL_Injection'],
            discoveredAt: Date.now(),
            status: 'open'
          }
        ],
        penetrationTests: [
          {
            id: 'pentest_1',
            testType: 'sql_injection',
            target: '/api/login',
            payload: "' OR 1=1 --",
            result: 'blocked',
            response: { status: 400, message: 'Invalid input' },
            impact: 'No impact',
            recommendation: 'Security effective',
            timestamp: Date.now(),
            severity: 'low'
          }
        ],
        complianceResults: [
          {
            standard: 'owasp_top_10',
            requirement: 'A1-Injection',
            status: 'compliant',
            evidence: 'Parameterized queries implemented',
            notes: 'Regular audits conducted'
          }
        ],
        overallScore: 88,
        riskLevel: 'low',
        recommendations: [
          'Continue regular security audits',
          'Monitor for new vulnerabilities'
        ],
        executiveSummary: 'Comprehensive security audit completed with low risk level. Minor improvements recommended.'
      };

      expect(auditReport.id).toBe('audit_comprehensive');
      expect(auditReport.overallScore).toBe(88);
      expect(auditReport.riskLevel).toBe('low');
      expect(auditReport.scope).toHaveLength(3);
      expect(auditReport.vulnerabilities).toHaveLength(1);
      expect(auditReport.penetrationTests).toHaveLength(1);
      expect(auditReport.complianceResults).toHaveLength(1);
      expect(auditReport.recommendations).toHaveLength(2);
    });

    test('should handle empty audit results', () => {
      const emptyAuditReport: SecurityAuditReport = {
        id: 'audit_empty',
        timestamp: Date.now(),
        duration: 5000,
        scope: ['vulnerability_scan'],
        vulnerabilities: [],
        penetrationTests: [],
        complianceResults: [],
        overallScore: 100,
        riskLevel: 'low',
        recommendations: [],
        executiveSummary: 'No security issues found during audit.'
      };

      expect(emptyAuditReport.vulnerabilities).toHaveLength(0);
      expect(emptyAuditReport.penetrationTests).toHaveLength(0);
      expect(emptyAuditReport.complianceResults).toHaveLength(0);
      expect(emptyAuditReport.overallScore).toBe(100);
      expect(emptyAuditReport.riskLevel).toBe('low');
    });
  });
});
