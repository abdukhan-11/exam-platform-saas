/**
 * Network Recovery Manager
 *
 * Specialized component for handling network connectivity issues
 * and implementing intelligent retry mechanisms during exam sessions.
 */

import { auditLogger } from './audit-logger';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  lastChecked: number;
}

export interface NetworkRecoveryConfig {
  maxRetryAttempts: number;
  retryDelay: number;
  retryBackoffMultiplier: number;
  maxRetryDelay: number;
  timeoutThreshold: number;
  pingInterval: number;
  enableOfflineMode: boolean;
}

export interface PendingRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class NetworkRecoveryManager {
  private config: NetworkRecoveryConfig;
  private networkStatus: NetworkStatus;
  private pendingRequests = new Map<string, PendingRequest>();
  private retryTimeouts = new Map<string, NodeJS.Timeout>();
  private pingInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<NetworkRecoveryConfig> = {}) {
    this.config = {
      maxRetryAttempts: 5,
      retryDelay: 1000, // 1 second
      retryBackoffMultiplier: 2,
      maxRetryDelay: 30000, // 30 seconds
      timeoutThreshold: 5000, // 5 seconds
      pingInterval: 30000, // 30 seconds
      enableOfflineMode: true,
      ...config
    };

    this.networkStatus = this.getInitialNetworkStatus();
  }

  /**
   * Initialize the network recovery manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.setupNetworkListeners();
      this.startPingMonitoring();

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Network recovery manager initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize network recovery manager:', error);
      throw error;
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Check if network is available for critical operations
   */
  isNetworkAvailable(): boolean {
    return this.networkStatus.isOnline &&
           this.networkStatus.effectiveType !== 'slow-2g' &&
           this.networkStatus.effectiveType !== '2g';
  }

  /**
   * Queue a request for retry when network is restored
   */
  queueRequest(request: Omit<PendingRequest, 'id' | 'timestamp' | 'retryCount'>): string {
    const requestId = this.generateRequestId();

    const pendingRequest: PendingRequest = {
      ...request,
      id: requestId,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.pendingRequests.set(requestId, pendingRequest);

    // If network is available, try immediately
    if (this.isNetworkAvailable()) {
      this.attemptRequest(pendingRequest);
    }

    return requestId;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(requestId: string): boolean {
    const timeout = this.retryTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(requestId);
    }

    return this.pendingRequests.delete(requestId);
  }

  /**
   * Force retry all pending requests
   */
  async retryAllPendingRequests(): Promise<void> {
    const requests = Array.from(this.pendingRequests.values())
      .sort((a, b) => {
        // Sort by priority (critical first)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    for (const request of requests) {
      await this.attemptRequest(request);
    }
  }

  /**
   * Handle network restoration
   */
  async handleNetworkRestored(): Promise<void> {
    this.updateNetworkStatus();

    auditLogger.logExamSecurity('exam_started', {
      examId: 'system',
      userId: 'system',
      sessionId: 'system',
      severity: 'low',
      description: 'Network connectivity restored',
      metadata: this.networkStatus
    });

    // Retry all pending requests
    await this.retryAllPendingRequests();
  }

  /**
   * Handle network loss
   */
  async handleNetworkLost(): Promise<void> {
    this.updateNetworkStatus();

    auditLogger.logExamSecurity('copy_paste', {
      examId: 'system',
      userId: 'system',
      sessionId: 'system',
      severity: 'high',
      description: 'Network connectivity lost',
      metadata: this.networkStatus
    });

    // Enable offline mode if configured
    if (this.config.enableOfflineMode) {
      this.enableOfflineMode();
    }
  }

  /**
   * Get pending requests count
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get pending requests by priority
   */
  getPendingRequestsByPriority(priority: PendingRequest['priority']): PendingRequest[] {
    return Array.from(this.pendingRequests.values())
      .filter(request => request.priority === priority);
  }

  /**
   * Clean up old pending requests
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoffTime = Date.now() - maxAge;
    const toDelete: string[] = [];

    for (const [requestId, request] of this.pendingRequests) {
      if (request.timestamp < cutoffTime) {
        toDelete.push(requestId);
      }
    }

    toDelete.forEach(requestId => {
      this.cancelRequest(requestId);
    });

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} old pending requests`);
    }
  }

  /**
   * Get network quality score (0-100)
   */
  getNetworkQualityScore(): number {
    if (!this.networkStatus.isOnline) return 0;

    let score = 50; // Base score

    // Adjust based on connection type
    switch (this.networkStatus.effectiveType) {
      case '4g':
        score += 40;
        break;
      case '3g':
        score += 20;
        break;
      case '2g':
        score += 5;
        break;
      case 'slow-2g':
        score += 0;
        break;
    }

    // Adjust based on RTT
    if (this.networkStatus.rtt < 100) score += 10;
    else if (this.networkStatus.rtt < 300) score += 5;
    else if (this.networkStatus.rtt > 1000) score -= 20;

    // Adjust based on downlink
    if (this.networkStatus.downlink > 5) score += 10;
    else if (this.networkStatus.downlink > 1) score += 5;
    else if (this.networkStatus.downlink < 0.5) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Set up network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.handleNetworkRestored();
    });

    window.addEventListener('offline', () => {
      this.handleNetworkLost();
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.updateNetworkStatus();
      });
    }
  }

  /**
   * Start ping monitoring
   */
  private startPingMonitoring(): void {
    this.pingInterval = setInterval(() => {
      this.performConnectivityCheck();
    }, this.config.pingInterval);
  }

  /**
   * Perform connectivity check
   */
  private async performConnectivityCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      // Simple ping to check connectivity
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });

      const rtt = Date.now() - startTime;

      // Update network status
      this.networkStatus.rtt = rtt;
      this.networkStatus.lastChecked = Date.now();

      if (!this.networkStatus.isOnline) {
        await this.handleNetworkRestored();
      }
    } catch (error) {
      if (this.networkStatus.isOnline) {
        await this.handleNetworkLost();
      }
    }
  }

  /**
   * Attempt to execute a request with retry logic
   */
  private async attemptRequest(request: PendingRequest): Promise<void> {
    if (!this.isNetworkAvailable()) {
      // Schedule retry when network is available
      this.scheduleRetry(request);
      return;
    }

    try {
      const response = await this.executeRequest(request);

      if (response.ok) {
        // Success - remove from pending
        this.pendingRequests.delete(request.id);
        const timeout = this.retryTimeouts.get(request.id);
        if (timeout) {
          clearTimeout(timeout);
          this.retryTimeouts.delete(request.id);
        }
      } else {
        // Server error - retry
        await this.handleRequestFailure(request);
      }
    } catch (error) {
      await this.handleRequestFailure(request);
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest(request: PendingRequest): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutThreshold);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: request.data ? JSON.stringify(request.data) : undefined,
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle request failure with retry logic
   */
  private async handleRequestFailure(request: PendingRequest): Promise<void> {
    request.retryCount++;

    if (request.retryCount >= this.config.maxRetryAttempts) {
      // Max retries reached - give up
      this.pendingRequests.delete(request.id);
      console.error(`Request failed after ${request.retryCount} attempts:`, request);
      return;
    }

    // Schedule retry with exponential backoff
    this.scheduleRetry(request);
  }

  /**
   * Schedule a retry attempt
   */
  private scheduleRetry(request: PendingRequest): void {
    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.retryBackoffMultiplier, request.retryCount - 1),
      this.config.maxRetryDelay
    );

    const timeout = setTimeout(() => {
      this.attemptRequest(request);
    }, delay);

    this.retryTimeouts.set(request.id, timeout);
  }

  /**
   * Get initial network status
   */
  private getInitialNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection;

    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      lastChecked: Date.now()
    };
  }

  /**
   * Update network status
   */
  private updateNetworkStatus(): void {
    const connection = (navigator as any).connection;

    this.networkStatus = {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      lastChecked: Date.now()
    };
  }

  /**
   * Enable offline mode
   */
  private enableOfflineMode(): void {
    // Implementation for offline mode
    console.log('Offline mode enabled');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Clear all timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.retryTimeouts.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const networkRecoveryManager = new NetworkRecoveryManager();
