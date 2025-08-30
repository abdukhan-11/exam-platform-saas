import { getRedisCache } from '@/lib/cache/redis-cache';

// Node configuration for distributed processing
export interface NodeConfig {
  nodeId: string;
  host: string;
  port: number;
  capabilities: {
    maxConcurrentJobs: number;
    supportedJobTypes: string[];
    priority: number; // Higher priority gets more jobs
  };
  lastHeartbeat: Date;
  status: 'active' | 'inactive' | 'overloaded';
}

// Distributed job with routing information
export interface DistributedJob {
  id: string;
  type: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  routingKey?: string; // For job-specific routing
  assignedNodeId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'queued' | 'assigned' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  result?: any;
  error?: string;
}

// Load balancing strategy
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  WEIGHTED_RANDOM = 'weighted_random',
  CAPABILITY_BASED = 'capability_based'
}

// Cluster health metrics
export interface ClusterHealth {
  totalNodes: number;
  activeNodes: number;
  totalJobs: number;
  processingJobs: number;
  failedJobs: number;
  averageJobTime: number;
  loadDistribution: Record<string, number>;
}

/**
 * Distributed result processor for horizontal scaling
 */
export class DistributedResultProcessor {
  private static instance: DistributedResultProcessor;
  private nodeId: string;
  private nodes: Map<string, NodeConfig> = new Map();
  private jobs: Map<string, DistributedJob> = new Map();
  private strategy: LoadBalancingStrategy = LoadBalancingStrategy.LEAST_LOADED;
  private heartbeatInterval: number = 30000; // 30 seconds
  private heartbeatTimer?: NodeJS.Timeout;
  private jobCleanupTimer?: NodeJS.Timeout;
  private isLeader = false;
  private leaderElectionTimer?: NodeJS.Timeout;

  private constructor() {
    this.nodeId = process.env.NODE_ID || `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.initializeNode();
    this.startLeaderElection();
    this.startHeartbeat();
    this.startJobCleanup();
  }

  static getInstance(): DistributedResultProcessor {
    if (!DistributedResultProcessor.instance) {
      DistributedResultProcessor.instance = new DistributedResultProcessor();
    }
    return DistributedResultProcessor.instance;
  }

  /**
   * Initialize this node in the cluster
   */
  private async initializeNode(): Promise<void> {
    const nodeConfig: NodeConfig = {
      nodeId: this.nodeId,
      host: process.env.NODE_HOST || 'localhost',
      port: parseInt(process.env.NODE_PORT || '3000'),
      capabilities: {
        maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '10'),
        supportedJobTypes: ['exam_submission', 'result_calculation', 'ranking_update', 'analytics_refresh'],
        priority: parseInt(process.env.NODE_PRIORITY || '1')
      },
      lastHeartbeat: new Date(),
      status: 'active'
    };

    this.nodes.set(this.nodeId, nodeConfig);

    // Register node with Redis
    const cache = getRedisCache();
    // Test Redis connection by setting a temporary value
    try {
      await cache.cacheAnalyticsData('node_test', 'test');
    } catch (error) {
      console.warn('Redis connection test failed:', error);
    }

    console.log(`Node ${this.nodeId} initialized with capabilities:`, nodeConfig.capabilities);
  }

  /**
   * Start leader election process
   */
  private async startLeaderElection(): Promise<void> {
    // Simple leader election using Redis
    this.leaderElectionTimer = setInterval(async () => {
      try {
        const cache = getRedisCache();

        // Try to acquire leadership lock
        const leaderKey = 'cluster:leader';
        const currentLeader = await cache.getCachedAnalyticsData(leaderKey);

        if (!currentLeader || currentLeader === this.nodeId) {
          // Become leader or maintain leadership
          await cache.cacheAnalyticsData(leaderKey, this.nodeId);

          if (!this.isLeader) {
            this.isLeader = true;
            console.log(`Node ${this.nodeId} became cluster leader`);
            this.startLeaderResponsibilities();
          }
        } else {
          // Not leader
          if (this.isLeader) {
            this.isLeader = false;
            console.log(`Node ${this.nodeId} lost leadership to ${currentLeader}`);
            this.stopLeaderResponsibilities();
          }
        }
      } catch (error) {
        console.error('Leader election error:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start leader responsibilities
   */
  private startLeaderResponsibilities(): void {
    // Leader handles node discovery, job distribution, and cluster monitoring
    console.log('Starting leader responsibilities...');
    // Implementation would include:
    // - Monitoring node health
    // - Redistributing jobs from failed nodes
    // - Load balancing decisions
    // - Cluster-wide statistics
  }

  /**
   * Stop leader responsibilities
   */
  private stopLeaderResponsibilities(): void {
    console.log('Stopping leader responsibilities...');
  }

  /**
   * Start heartbeat mechanism
   */
  private async startHeartbeat(): Promise<void> {
    this.heartbeatTimer = setInterval(async () => {
      try {
        const cache = getRedisCache();
        const nodeKey = `node:${this.nodeId}:heartbeat`;

        const nodeInfo = {
          nodeId: this.nodeId,
          lastHeartbeat: new Date().toISOString(),
          status: 'active',
          isLeader: this.isLeader,
          activeJobs: Array.from(this.jobs.values()).filter(job => job.status === 'processing').length
        };

        await cache.cacheAnalyticsData(nodeKey, nodeInfo);

        // Update local node status
        const localNode = this.nodes.get(this.nodeId);
        if (localNode) {
          localNode.lastHeartbeat = new Date();
          localNode.status = 'active';
        }

      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, this.heartbeatInterval);
  }

  /**
   * Start job cleanup process
   */
  private async startJobCleanup(): Promise<void> {
    this.jobCleanupTimer = setInterval(async () => {
      const now = Date.now();
      const staleJobThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [jobId, job] of this.jobs.entries()) {
        // Clean up stale jobs
        if (job.status === 'processing' &&
            job.startedAt &&
            (now - job.startedAt.getTime()) > staleJobThreshold) {
          console.warn(`Cleaning up stale job ${jobId}`);
          job.status = 'failed';
          job.error = 'Job timed out';
          await this.updateJobStatus(job);
        }

        // Clean up old completed jobs
        if ((job.status === 'completed' || job.status === 'failed') &&
            job.completedAt &&
            (now - job.completedAt.getTime()) > 24 * 60 * 60 * 1000) { // 24 hours
          this.jobs.delete(jobId);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Submit a job for distributed processing
   */
  async submitJob(
    type: string,
    data: any,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      routingKey?: string;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const jobId = `dist_job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: DistributedJob = {
      id: jobId,
      type,
      data,
      priority: options.priority || 'normal',
      routingKey: options.routingKey,
      createdAt: new Date(),
      status: 'queued',
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };

    this.jobs.set(jobId, job);
    await this.persistJob(job);

    // If this node is not overloaded, try to process locally
    if (this.canAcceptJob(job)) {
      await this.assignJob(job);
    } else {
      // Queue for other nodes
      await this.queueJobForDistribution(job);
    }

    console.log(`Submitted distributed job ${jobId} of type ${type}`);
    return jobId;
  }

  /**
   * Assign a job to this node
   */
  private async assignJob(job: DistributedJob): Promise<void> {
    job.status = 'assigned';
    job.assignedNodeId = this.nodeId;
    await this.updateJobStatus(job);

    // Start processing in background
    setImmediate(() => this.processJob(job));
  }

  /**
   * Process a job locally
   */
  private async processJob(job: DistributedJob): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date();
      await this.updateJobStatus(job);

      console.log(`Processing job ${job.id} on node ${this.nodeId}`);

      // Route to appropriate processor based on job type
      let result;
      switch (job.type) {
        case 'exam_submission':
          result = await this.processExamSubmission(job.data);
          break;
        case 'result_calculation':
          result = await this.processResultCalculation(job.data);
          break;
        case 'ranking_update':
          result = await this.processRankingUpdate(job.data);
          break;
        case 'analytics_refresh':
          result = await this.processAnalyticsRefresh(job.data);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      await this.updateJobStatus(job);

      console.log(`Job ${job.id} completed successfully`);

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      job.retryCount++;
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.retryCount < job.maxRetries) {
        // Re-queue for retry
        job.status = 'queued';
        job.assignedNodeId = undefined;
        await this.queueJobForDistribution(job);
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
        await this.updateJobStatus(job);
      }
    }
  }

  /**
   * Process exam submission
   */
  private async processExamSubmission(data: any): Promise<any> {
    // Import and use existing exam submission logic
    const { resultProcessingQueue } = await import('@/lib/queue/result-processing-queue');
    return resultProcessingQueue.queueBatchSubmission(data);
  }

  /**
   * Process result calculation
   */
  private async processResultCalculation(data: any): Promise<any> {
    const { resultProcessingQueue } = await import('@/lib/queue/result-processing-queue');
    return resultProcessingQueue.queueResultCalculation(data.examId, data.userId);
  }

  /**
   * Process ranking update
   */
  private async processRankingUpdate(data: any): Promise<any> {
    const { resultProcessingQueue } = await import('@/lib/queue/result-processing-queue');
    return resultProcessingQueue.queueRankingUpdate(data.examId);
  }

  /**
   * Process analytics refresh
   */
  private async processAnalyticsRefresh(data: any): Promise<any> {
    const { resultProcessingQueue } = await import('@/lib/queue/result-processing-queue');
    return resultProcessingQueue.queueAnalyticsRefresh(data.scope, data.targetId);
  }

  /**
   * Queue job for distribution to other nodes
   */
  private async queueJobForDistribution(job: DistributedJob): Promise<void> {
    const cache = getRedisCache();
    const queueKey = `distributed:queue:${job.priority}`;

    await cache.cacheAnalyticsData(`distributed:job:${job.id}`, job);
    await cache.cacheAnalyticsData(queueKey, job.id);

    // Notify other nodes
    await cache.cacheAnalyticsData('distributed:notifications', {
      type: 'new_job',
      jobId: job.id,
      priority: job.priority,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if this node can accept a job
   */
  private canAcceptJob(job: DistributedJob): boolean {
    const nodeConfig = this.nodes.get(this.nodeId);
    if (!nodeConfig) return false;

    // Check capabilities
    if (!nodeConfig.capabilities.supportedJobTypes.includes(job.type)) {
      return false;
    }

    // Check current load
    const activeJobs = Array.from(this.jobs.values()).filter(j =>
      j.status === 'processing' && j.assignedNodeId === this.nodeId
    ).length;

    return activeJobs < nodeConfig.capabilities.maxConcurrentJobs;
  }

  /**
   * Get optimal node for job processing
   */
  private async getOptimalNode(job: DistributedJob): Promise<string | null> {
    const eligibleNodes = Array.from(this.nodes.values()).filter(node =>
      node.status === 'active' &&
      node.capabilities.supportedJobTypes.includes(job.type)
    );

    if (eligibleNodes.length === 0) return null;

    switch (this.strategy) {
      case LoadBalancingStrategy.LEAST_LOADED:
        return this.getLeastLoadedNode(eligibleNodes);

      case LoadBalancingStrategy.WEIGHTED_RANDOM:
        return this.getWeightedRandomNode(eligibleNodes);

      case LoadBalancingStrategy.CAPABILITY_BASED:
        return this.getCapabilityBasedNode(eligibleNodes, job);

      case LoadBalancingStrategy.ROUND_ROBIN:
      default:
        return this.getRoundRobinNode(eligibleNodes);
    }
  }

  /**
   * Get least loaded node
   */
  private getLeastLoadedNode(nodes: NodeConfig[]): string {
    let bestNode = nodes[0];
    let minLoad = Infinity;

    for (const node of nodes) {
      // In a real implementation, you'd check actual load from Redis
      const load = Math.random(); // Placeholder
      if (load < minLoad) {
        minLoad = load;
        bestNode = node;
      }
    }

    return bestNode.nodeId;
  }

  /**
   * Get weighted random node
   */
  private getWeightedRandomNode(nodes: NodeConfig[]): string {
    const totalWeight = nodes.reduce((sum, node) => sum + node.capabilities.priority, 0);
    const random = Math.random() * totalWeight;

    let weightSum = 0;
    for (const node of nodes) {
      weightSum += node.capabilities.priority;
      if (random <= weightSum) {
        return node.nodeId;
      }
    }

    return nodes[0].nodeId;
  }

  /**
   * Get capability-based node
   */
  private getCapabilityBasedNode(nodes: NodeConfig[], job: DistributedJob): string {
    // Find node with highest priority for this job type
    const sortedNodes = nodes.sort((a, b) => {
      const aPriority = a.capabilities.supportedJobTypes.includes(job.type) ? a.capabilities.priority : 0;
      const bPriority = b.capabilities.supportedJobTypes.includes(job.type) ? b.capabilities.priority : 0;
      return bPriority - aPriority;
    });

    return sortedNodes[0].nodeId;
  }

  /**
   * Get round-robin node
   */
  private getRoundRobinNode(nodes: NodeConfig[]): string {
    // Simple round-robin using timestamp
    const index = Math.floor(Date.now() / 1000) % nodes.length;
    return nodes[index].nodeId;
  }

  /**
   * Persist job to Redis
   */
  private async persistJob(job: DistributedJob): Promise<void> {
    const cache = getRedisCache();
    await cache.cacheAnalyticsData(`distributed:job:${job.id}`, job);
  }

  /**
   * Update job status
   */
  private async updateJobStatus(job: DistributedJob): Promise<void> {
    this.jobs.set(job.id, job);
    await this.persistJob(job);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<DistributedJob | null> {
    const localJob = this.jobs.get(jobId);
    if (localJob) return localJob;

    // Check Redis for distributed jobs
    const cache = getRedisCache();
    const job = await cache.getCachedAnalyticsData(`distributed:job:${jobId}`);
    return job || null;
  }

  /**
   * Get cluster health
   */
  async getClusterHealth(): Promise<ClusterHealth> {
    const totalNodes = this.nodes.size;
    const activeNodes = Array.from(this.nodes.values()).filter(node => node.status === 'active').length;

    const allJobs = Array.from(this.jobs.values());
    const totalJobs = allJobs.length;
    const processingJobs = allJobs.filter(job => job.status === 'processing').length;
    const failedJobs = allJobs.filter(job => job.status === 'failed').length;

    // Calculate average job time
    const completedJobs = allJobs.filter(job => job.completedAt && job.startedAt);
    const totalJobTime = completedJobs.reduce((sum, job) =>
      sum + (job.completedAt!.getTime() - job.startedAt!.getTime()), 0
    );
    const averageJobTime = completedJobs.length > 0 ? totalJobTime / completedJobs.length : 0;

    // Calculate load distribution
    const loadDistribution: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      loadDistribution[node.nodeId] = Math.random(); // Placeholder
    }

    return {
      totalNodes,
      activeNodes,
      totalJobs,
      processingJobs,
      failedJobs,
      averageJobTime,
      loadDistribution
    };
  }

  /**
   * Set load balancing strategy
   */
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    console.log(`Load balancing strategy changed to: ${strategy}`);
  }

  /**
   * Scale cluster by adding/removing nodes
   */
  async scaleCluster(targetNodeCount: number): Promise<void> {
    console.log(`Scaling cluster to ${targetNodeCount} nodes`);

    // In a real implementation, this would:
    // - Start/stop additional node processes
    // - Update load balancer configuration
    // - Redistribute existing jobs
    // - Update cluster configuration

    // For now, just log the scaling action
    if (this.isLeader) {
      console.log(`Leader node ${this.nodeId} initiating cluster scaling`);
    }
  }

  /**
   * Gracefully shutdown
   */
  async shutdown(): Promise<void> {
    console.log(`Shutting down distributed processor for node ${this.nodeId}`);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.jobCleanupTimer) {
      clearInterval(this.jobCleanupTimer);
    }

    if (this.leaderElectionTimer) {
      clearInterval(this.leaderElectionTimer);
    }

    // Mark node as inactive
    const node = this.nodes.get(this.nodeId);
    if (node) {
      node.status = 'inactive';
      const cache = getRedisCache();
      await cache.cacheAnalyticsData(`node:${this.nodeId}:status`, 'inactive');
    }

    // Transfer leadership if this was the leader
    if (this.isLeader) {
      await this.transferLeadership();
    }

    console.log(`Node ${this.nodeId} shutdown complete`);
  }

  /**
   * Transfer leadership to another node
   */
  private async transferLeadership(): Promise<void> {
    const cache = getRedisCache();
    const otherActiveNodes = Array.from(this.nodes.values()).filter(node =>
      node.nodeId !== this.nodeId && node.status === 'active'
    );

    if (otherActiveNodes.length > 0) {
      const newLeader = otherActiveNodes[0];
      await cache.cacheAnalyticsData('cluster:leader', newLeader.nodeId);
      console.log(`Leadership transferred to node ${newLeader.nodeId}`);
    } else {
      // Clear leadership if no other nodes available
      await cache.cacheAnalyticsData('cluster:leader', null);
      console.log('Leadership cleared - no active nodes remaining');
    }
  }
}

// Singleton instance
export const distributedProcessor = DistributedResultProcessor.getInstance();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await distributedProcessor.shutdown();
});

process.on('SIGINT', async () => {
  await distributedProcessor.shutdown();
});
