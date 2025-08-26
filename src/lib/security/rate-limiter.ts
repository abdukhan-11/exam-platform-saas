/**
 * Rate Limiting and Brute Force Protection System
 * 
 * This module provides comprehensive rate limiting and brute force protection
 * for login attempts and API endpoints.
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  keyGenerator?: (req: any) => string; // Custom key generator
  onLimitReached?: (key: string, req: any) => void; // Callback when limit is reached
}

export interface RateLimitEntry {
  key: string;
  count: number;
  resetTime: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  blockUntil?: number;
}

export interface BruteForceProtection {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  progressiveDelay: boolean;
  maxDelayMs: number;
}

export interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  uniqueUsers: number;
  topIPs: { ip: string; count: number }[];
  topUsers: { userId: string; count: number }[];
  violations: number;
  lastReset: number;
}

class RateLimiterService {
  private static instance: RateLimiterService;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private bruteForceAttempts: Map<string, { count: number; lastAttempt: number; blockUntil?: number }> = new Map();
  private metrics: SecurityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    uniqueIPs: 0,
    uniqueUsers: 0,
    topIPs: [],
    topUsers: [],
    violations: 0,
    lastReset: Date.now(),
  };

  // Default configurations
  private defaultRateLimitConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  private defaultBruteForceConfig: BruteForceProtection = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    progressiveDelay: true,
    maxDelayMs: 60 * 1000, // 1 minute
  };

  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * Check rate limit for a request
   */
  checkRateLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const finalConfig = { ...this.defaultRateLimitConfig, ...config };
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanupExpiredEntries();

    let entry = this.rateLimits.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        key,
        count: 0,
        resetTime: now + finalConfig.windowMs,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      };
      this.rateLimits.set(key, entry);
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
      this.updateMetrics(key, false);
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
      };
    }

    // Reset block status if block period has expired
    if (entry.blocked && (!entry.blockUntil || now >= entry.blockUntil)) {
      entry.blocked = false;
      entry.blockUntil = undefined;
    }

    // Increment count
    entry.count++;
    entry.lastRequest = now;

    const allowed = entry.count <= finalConfig.maxRequests;
    
    if (!allowed) {
      entry.blocked = true;
      entry.blockUntil = now + finalConfig.windowMs;
      
      // Call callback if provided
      if (finalConfig.onLimitReached) {
        finalConfig.onLimitReached(key, { count: entry.count, resetTime: entry.resetTime });
      }
    }

    this.updateMetrics(key, allowed);

    return {
      allowed,
      remaining: Math.max(0, finalConfig.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: !allowed ? Math.ceil((entry.resetTime - now) / 1000) : undefined,
    };
  }

  /**
   * Check brute force protection for authentication attempts
   */
  checkBruteForce(
    identifier: string, // IP address, user ID, or email
    config: Partial<BruteForceProtection> = {}
  ): {
    allowed: boolean;
    attempts: number;
    remainingAttempts: number;
    blockUntil?: number;
    delayMs?: number;
  } {
    const finalConfig = { ...this.defaultBruteForceConfig, ...config };
    const now = Date.now();
    
    let attempt = this.bruteForceAttempts.get(identifier);
    
    if (!attempt) {
      attempt = {
        count: 0,
        lastAttempt: now,
      };
      this.bruteForceAttempts.set(identifier, attempt);
    }

    // Check if currently blocked
    if (attempt.blockUntil && now < attempt.blockUntil) {
      return {
        allowed: false,
        attempts: attempt.count,
        remainingAttempts: 0,
        blockUntil: attempt.blockUntil,
      };
    }

    // Reset if window has expired
    if (now - attempt.lastAttempt > finalConfig.windowMs) {
      attempt.count = 0;
      attempt.blockUntil = undefined;
    }

    // Increment attempt count
    attempt.count++;
    attempt.lastAttempt = now;

    const allowed = attempt.count <= finalConfig.maxAttempts;
    
    if (!allowed) {
      // Block the identifier
      attempt.blockUntil = now + finalConfig.blockDurationMs;
      this.metrics.violations++;
    }

    // Calculate progressive delay
    let delayMs = 0;
    if (finalConfig.progressiveDelay && attempt.count > 1) {
      delayMs = Math.min(
        Math.pow(2, attempt.count - 1) * 1000, // Exponential backoff
        finalConfig.maxDelayMs
      );
    }

    return {
      allowed,
      attempts: attempt.count,
      remainingAttempts: Math.max(0, finalConfig.maxAttempts - attempt.count),
      blockUntil: attempt.blockUntil,
      delayMs: delayMs > 0 ? delayMs : undefined,
    };
  }

  /**
   * Record successful authentication (reset brute force counter)
   */
  recordSuccessfulAuth(identifier: string): void {
    this.bruteForceAttempts.delete(identifier);
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAuth(identifier: string, reason?: string): void {
    const attempt = this.bruteForceAttempts.get(identifier);
    if (attempt) {
      // Log the failed attempt
      console.warn(`[BRUTE FORCE] Failed auth attempt for ${identifier}: ${reason || 'Unknown reason'}`);
    }
  }

  /**
   * Get rate limit status for a key
   */
  getRateLimitStatus(key: string): RateLimitEntry | null {
    const entry = this.rateLimits.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      // Entry has expired
      this.rateLimits.delete(key);
      return null;
    }

    return { ...entry };
  }

  /**
   * Get brute force status for an identifier
   */
  getBruteForceStatus(identifier: string): {
    attempts: number;
    lastAttempt: number;
    blockUntil?: number;
    isBlocked: boolean;
  } | null {
    const attempt = this.bruteForceAttempts.get(identifier);
    if (!attempt) {
      return null;
    }

    const now = Date.now();
    const isBlocked = attempt.blockUntil ? now < attempt.blockUntil : false;

    return {
      attempts: attempt.count,
      lastAttempt: attempt.lastAttempt,
      blockUntil: attempt.blockUntil,
      isBlocked,
    };
  }

  /**
   * Reset rate limit for a key
   */
  resetRateLimit(key: string): boolean {
    return this.rateLimits.delete(key);
  }

  /**
   * Reset brute force protection for an identifier
   */
  resetBruteForceProtection(identifier: string): boolean {
    return this.bruteForceAttempts.delete(identifier);
  }

  /**
   * Block an identifier manually
   */
  blockIdentifier(identifier: string, durationMs: number, reason?: string): void {
    const attempt = this.bruteForceAttempts.get(identifier) || {
      count: 0,
      lastAttempt: Date.now(),
    };

    attempt.blockUntil = Date.now() + durationMs;
    this.bruteForceAttempts.set(identifier, attempt);

    console.warn(`[RATE LIMITER] Manually blocked ${identifier} for ${durationMs}ms: ${reason || 'No reason provided'}`);
  }

  /**
   * Unblock an identifier
   */
  unblockIdentifier(identifier: string): boolean {
    const attempt = this.bruteForceAttempts.get(identifier);
    if (attempt) {
      attempt.blockUntil = undefined;
      return true;
    }
    return false;
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    this.updateMetricsSummary();
    return { ...this.metrics };
  }

  /**
   * Reset security metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      uniqueIPs: 0,
      uniqueUsers: 0,
      topIPs: [],
      topUsers: [],
      violations: 0,
      lastReset: Date.now(),
    };
  }

  /**
   * Get all blocked identifiers
   */
  getBlockedIdentifiers(): Array<{
    identifier: string;
    attempts: number;
    blockUntil: number;
    remainingTime: number;
  }> {
    const now = Date.now();
    const blocked: Array<{
      identifier: string;
      attempts: number;
      blockUntil: number;
      remainingTime: number;
    }> = [];

    for (const [identifier, attempt] of this.bruteForceAttempts.entries()) {
      if (attempt.blockUntil && now < attempt.blockUntil) {
        blocked.push({
          identifier,
          attempts: attempt.count,
          blockUntil: attempt.blockUntil,
          remainingTime: attempt.blockUntil - now,
        });
      }
    }

    return blocked.sort((a, b) => b.remainingTime - a.remainingTime);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();

    // Clean up rate limit entries
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }

    // Clean up brute force entries
    for (const [identifier, attempt] of this.bruteForceAttempts.entries()) {
      const windowExpired = now - attempt.lastAttempt > this.defaultBruteForceConfig.windowMs;
      const blockExpired = attempt.blockUntil && now >= attempt.blockUntil;
      
      if (windowExpired && blockExpired) {
        this.bruteForceAttempts.delete(identifier);
      }
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(key: string, allowed: boolean): void {
    this.metrics.totalRequests++;
    
    if (!allowed) {
      this.metrics.blockedRequests++;
    }

    // Extract IP and user from key (assuming format like "ip:192.168.1.1" or "user:123")
    const [type, value] = key.split(':');
    if (type === 'ip') {
      // This is a simplified approach - in reality you'd track unique IPs more efficiently
      this.metrics.uniqueIPs = this.rateLimits.size;
    } else if (type === 'user') {
      // This is a simplified approach - in reality you'd track unique users more efficiently
      this.metrics.uniqueUsers = this.rateLimits.size;
    }
  }

  /**
   * Update metrics summary
   */
  private updateMetricsSummary(): void {
    // Calculate top IPs and users
    const ipCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();

    for (const [key, entry] of this.rateLimits.entries()) {
      const [type, value] = key.split(':');
      if (type === 'ip') {
        ipCounts.set(value, (ipCounts.get(value) || 0) + entry.count);
      } else if (type === 'user') {
        userCounts.set(value, (userCounts.get(value) || 0) + entry.count);
      }
    }

    this.metrics.topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    this.metrics.topUsers = Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Generate rate limit key
   */
  generateKey(type: 'ip' | 'user' | 'global', identifier: string): string {
    return `${type}:${identifier}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    rateLimit: RateLimitConfig;
    bruteForce: BruteForceProtection;
  } {
    return {
      rateLimit: { ...this.defaultRateLimitConfig },
      bruteForce: { ...this.defaultBruteForceConfig },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    rateLimit?: Partial<RateLimitConfig>;
    bruteForce?: Partial<BruteForceProtection>;
  }): void {
    if (config.rateLimit) {
      this.defaultRateLimitConfig = { ...this.defaultRateLimitConfig, ...config.rateLimit };
    }
    
    if (config.bruteForce) {
      this.defaultBruteForceConfig = { ...this.defaultBruteForceConfig, ...config.bruteForce };
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.rateLimits.clear();
    this.bruteForceAttempts.clear();
    this.resetMetrics();
  }

  /**
   * Export data for backup/analysis
   */
  exportData(): {
    rateLimits: Array<[string, RateLimitEntry]>;
    bruteForceAttempts: Array<[string, any]>;
    metrics: SecurityMetrics;
  } {
    return {
      rateLimits: Array.from(this.rateLimits.entries()),
      bruteForceAttempts: Array.from(this.bruteForceAttempts.entries()),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Import data from backup
   */
  importData(data: {
    rateLimits: Array<[string, RateLimitEntry]>;
    bruteForceAttempts: Array<[string, any]>;
    metrics: SecurityMetrics;
  }): void {
    this.rateLimits = new Map(data.rateLimits);
    this.bruteForceAttempts = new Map(data.bruteForceAttempts);
    this.metrics = { ...data.metrics };
  }
}

export const rateLimiter = RateLimiterService.getInstance();
export default rateLimiter;
