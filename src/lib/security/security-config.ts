/**
 * Security Configuration
 * 
 * This module defines comprehensive security policies, thresholds, and settings
 * for the super admin panel and overall platform security.
 */

export interface SecurityPolicy {
  // Authentication Policies
  authentication: {
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: number; // days
    };
    sessionPolicy: {
      timeout: number; // minutes
      maxConcurrentSessions: number;
      idleTimeout: number; // minutes
    };
    mfaPolicy: {
      enabled: boolean;
      required: boolean;
      methods: ('totp' | 'sms' | 'email')[];
    };
  };

  // Authorization Policies
  authorization: {
    roleHierarchy: {
      SUPER_ADMIN: string[];
      COLLEGE_ADMIN: string[];
      TEACHER: string[];
      STUDENT: string[];
    };
    permissionMatrix: Record<string, string[]>;
    ipRestrictions: {
      enabled: boolean;
      whitelist: string[];
      blacklist: string[];
      geolocationRestrictions: {
        enabled: boolean;
        allowedCountries: string[];
        blockedCountries: string[];
      };
    };
  };

  // Audit and Logging Policies
  audit: {
    enabled: boolean;
    retentionDays: number;
    logLevels: ('info' | 'warn' | 'error' | 'critical')[];
    events: {
      authentication: boolean;
      authorization: boolean;
      dataAccess: boolean;
      systemChanges: boolean;
      securityEvents: boolean;
    };
    realTimeAlerts: {
      enabled: boolean;
      criticalThreshold: number;
      highThreshold: number;
      mediumThreshold: number;
    };
  };

  // Security Monitoring Policies
  monitoring: {
    enabled: boolean;
    realTimeMonitoring: boolean;
    anomalyDetection: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high';
      thresholds: {
        failedLogins: number;
        suspiciousIPs: number;
        dataAccess: number;
        privilegeEscalation: number;
      };
    };
    threatIntelligence: {
      enabled: boolean;
      sources: string[];
      updateInterval: number; // minutes
    };
  };

  // Incident Response Policies
  incidentResponse: {
    enabled: boolean;
    autoResponse: {
      enabled: boolean;
      actions: ('block_ip' | 'lock_account' | 'notify_admin' | 'log_event')[];
    };
    escalation: {
      enabled: boolean;
      levels: {
        low: string[];
        medium: string[];
        high: string[];
        critical: string[];
      };
    };
    notifications: {
      email: boolean;
      sms: boolean;
      webhook: boolean;
      dashboard: boolean;
    };
  };

  // Data Protection Policies
  dataProtection: {
    encryption: {
      atRest: boolean;
      inTransit: boolean;
      algorithm: string;
      keyRotation: number; // days
    };
    accessControl: {
      principleOfLeastPrivilege: boolean;
      roleBasedAccess: boolean;
      attributeBasedAccess: boolean;
    };
    privacy: {
      dataRetention: number; // days
      dataAnonymization: boolean;
      gdprCompliance: boolean;
    };
  };
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  authentication: {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90
    },
    sessionPolicy: {
      timeout: 30,
      maxConcurrentSessions: 3,
      idleTimeout: 15
    },
    mfaPolicy: {
      enabled: true,
      required: false,
      methods: ['totp', 'email']
    }
  },

  authorization: {
    roleHierarchy: {
      SUPER_ADMIN: ['*'],
      COLLEGE_ADMIN: ['college_management', 'user_management', 'exam_management'],
      TEACHER: ['exam_creation', 'student_management', 'grade_management'],
      STUDENT: ['exam_taking', 'grade_viewing', 'profile_management']
    },
    permissionMatrix: {
      'college_management': ['create', 'read', 'update', 'delete'],
      'user_management': ['create', 'read', 'update', 'delete'],
      'exam_management': ['create', 'read', 'update', 'delete'],
      'exam_creation': ['create', 'read', 'update'],
      'student_management': ['read', 'update'],
      'grade_management': ['create', 'read', 'update'],
      'exam_taking': ['read'],
      'grade_viewing': ['read'],
      'profile_management': ['read', 'update']
    },
    ipRestrictions: {
      enabled: false,
      whitelist: [],
      blacklist: [],
      geolocationRestrictions: {
        enabled: false,
        allowedCountries: [],
        blockedCountries: []
      }
    }
  },

  audit: {
    enabled: true,
    retentionDays: 365,
    logLevels: ['info', 'warn', 'error', 'critical'],
    events: {
      authentication: true,
      authorization: true,
      dataAccess: true,
      systemChanges: true,
      securityEvents: true
    },
    realTimeAlerts: {
      enabled: true,
      criticalThreshold: 1,
      highThreshold: 5,
      mediumThreshold: 20
    }
  },

  monitoring: {
    enabled: true,
    realTimeMonitoring: true,
    anomalyDetection: {
      enabled: true,
      sensitivity: 'medium',
      thresholds: {
        failedLogins: 5,
        suspiciousIPs: 3,
        dataAccess: 100,
        privilegeEscalation: 1
      }
    },
    threatIntelligence: {
      enabled: true,
      sources: ['internal', 'external'],
      updateInterval: 60
    }
  },

  incidentResponse: {
    enabled: true,
    autoResponse: {
      enabled: true,
      actions: ['block_ip', 'lock_account', 'notify_admin', 'log_event']
    },
    escalation: {
      enabled: true,
      levels: {
        low: ['log_event'],
        medium: ['log_event', 'notify_admin'],
        high: ['log_event', 'notify_admin', 'block_ip'],
        critical: ['log_event', 'notify_admin', 'block_ip', 'lock_account', 'emergency_contact']
      }
    },
    notifications: {
      email: true,
      sms: false,
      webhook: true,
      dashboard: true
    }
  },

  dataProtection: {
    encryption: {
      atRest: true,
      inTransit: true,
      algorithm: 'AES-256-GCM',
      keyRotation: 30
    },
    accessControl: {
      principleOfLeastPrivilege: true,
      roleBasedAccess: true,
      attributeBasedAccess: false
    },
    privacy: {
      dataRetention: 2555, // 7 years
      dataAnonymization: true,
      gdprCompliance: true
    }
  }
};

export class SecurityConfigManager {
  private static instance: SecurityConfigManager;
  private config: SecurityPolicy;

  private constructor() {
    this.config = { ...DEFAULT_SECURITY_POLICY };
  }

  static getInstance(): SecurityConfigManager {
    if (!SecurityConfigManager.instance) {
      SecurityConfigManager.instance = new SecurityConfigManager();
    }
    return SecurityConfigManager.instance;
  }

  getConfig(): SecurityPolicy {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SecurityPolicy>): void {
    this.config = { ...this.config, ...updates };
  }

  getAuthenticationPolicy() {
    return this.config.authentication;
  }

  getAuthorizationPolicy() {
    return this.config.authorization;
  }

  getAuditPolicy() {
    return this.config.audit;
  }

  getMonitoringPolicy() {
    return this.config.monitoring;
  }

  getIncidentResponsePolicy() {
    return this.config.incidentResponse;
  }

  getDataProtectionPolicy() {
    return this.config.dataProtection;
  }

  // Validation methods
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const policy = this.config.authentication.passwordPolicy;
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateIPAddress(ip: string): { allowed: boolean; reason?: string } {
    const ipPolicy = this.config.authorization.ipRestrictions;

    if (!ipPolicy.enabled) {
      return { allowed: true };
    }

    // Check blacklist
    if (ipPolicy.blacklist.includes(ip)) {
      return { allowed: false, reason: 'IP address is blacklisted' };
    }

    // Check whitelist (if enabled and not empty)
    if (ipPolicy.whitelist.length > 0 && !ipPolicy.whitelist.includes(ip)) {
      return { allowed: false, reason: 'IP address not in whitelist' };
    }

    return { allowed: true };
  }

  shouldEscalate(severity: 'low' | 'medium' | 'high' | 'critical'): boolean {
    const policy = this.config.incidentResponse.escalation;
    return policy.enabled && policy.levels[severity].length > 1;
  }

  getEscalationActions(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const policy = this.config.incidentResponse.escalation;
    return policy.enabled ? policy.levels[severity] : [];
  }
}

export const securityConfig = SecurityConfigManager.getInstance();
