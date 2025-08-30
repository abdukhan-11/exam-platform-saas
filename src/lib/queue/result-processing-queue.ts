import { getRedisCache } from '@/lib/cache/redis-cache';

// Types for queue operations
export interface QueueJob {
  id: string;
  type: 'exam_submission' | 'result_calculation' | 'ranking_update' | 'analytics_refresh';
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
}

export interface BatchResultSubmission {
  examId: string;
  submissions: Array<{
    userId: string;
    answers: Record<string, any>;
    startTime: Date;
    endTime: Date;
  }>;
  options?: {
    skipValidation?: boolean;
    forceRecalculation?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };
}

export interface QueueStats {
  totalQueued: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  averageProcessingTime: number;
  queueLength: number;
  workersActive: number;
}

/**
 * Result Processing Queue Manager
 * Handles background processing of exam results, rankings, and analytics
 */
export class ResultProcessingQueue {
  private static instance: ResultProcessingQueue;
  private redis: any;
  private workers: Map<string, Worker> = new Map();
  private maxWorkers = parseInt(process.env.QUEUE_MAX_WORKERS || '5');
  private isProcessing = false;

  private constructor() {
    this.initializeRedis();
    this.startWorkerPool();
  }

  static getInstance(): ResultProcessingQueue {
    if (!ResultProcessingQueue.instance) {
      ResultProcessingQueue.instance = new ResultProcessingQueue();
    }
    return ResultProcessingQueue.instance;
  }

  private async initializeRedis() {
    const cache = getRedisCache();
    // Get the Redis instance from cache manager
    this.redis = (cache as any).redis;
  }

  private startWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(`worker-${i}`, this);
      this.workers.set(worker.id, worker);
      worker.start();
    }
  }

  /**
   * Queue a batch of exam results for processing
   */
  async queueBatchSubmission(submission: BatchResultSubmission): Promise<string> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: QueueJob = {
      id: jobId,
      type: 'exam_submission',
      data: submission,
      priority: submission.options?.priority || 'normal',
      status: 'queued',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      progress: {
        current: 0,
        total: submission.submissions.length,
        message: 'Queued for processing'
      }
    };

    await this.addJobToQueue(job);
    console.log(`Queued batch submission job ${jobId} with ${submission.submissions.length} submissions`);

    return jobId;
  }

  /**
   * Queue individual result calculation
   */
  async queueResultCalculation(examId: string, userId: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<string> {
    const jobId = `calc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: QueueJob = {
      id: jobId,
      type: 'result_calculation',
      data: { examId, userId },
      priority,
      status: 'queued',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    await this.addJobToQueue(job);
    return jobId;
  }

  /**
   * Queue ranking updates for an exam
   */
  async queueRankingUpdate(examId: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<string> {
    const jobId = `ranking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: QueueJob = {
      id: jobId,
      type: 'ranking_update',
      data: { examId },
      priority,
      status: 'queued',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 2
    };

    await this.addJobToQueue(job);
    return jobId;
  }

  /**
   * Queue analytics refresh
   */
  async queueAnalyticsRefresh(scope: 'exam' | 'college' | 'global', targetId?: string, priority: 'low' | 'normal' | 'high' = 'low'): Promise<string> {
    const jobId = `analytics_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: QueueJob = {
      id: jobId,
      type: 'analytics_refresh',
      data: { scope, targetId },
      priority,
      status: 'queued',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 2
    };

    await this.addJobToQueue(job);
    return jobId;
  }

  /**
   * Add job to appropriate queue based on priority
   */
  private async addJobToQueue(job: QueueJob): Promise<void> {
    const queueKey = `queue:${job.priority}:${job.type}`;
    const jobKey = `job:${job.id}`;

    // Store job data
    await this.redis.setex(jobKey, 86400, JSON.stringify(job)); // 24 hours TTL

    // Add to priority queue
    await this.redis.zadd(queueKey, job.createdAt.getTime(), job.id);

    // Notify workers
    await this.redis.publish('queue:notifications', JSON.stringify({
      type: 'new_job',
      jobId: job.id,
      priority: job.priority,
      jobType: job.type
    }));
  }

  /**
   * Get next job from queue for processing
   */
  private async getNextJob(): Promise<QueueJob | null> {
    // Check queues in priority order
    const priorityOrder = ['critical', 'high', 'normal', 'low'];

    for (const priority of priorityOrder) {
      const queueKey = `queue:${priority}`;
      const jobId = await this.redis.zpopmin(queueKey);

      if (jobId && jobId.length > 0) {
        const jobKey = `job:${jobId[0]}`;
        const jobData = await this.redis.get(jobKey);

        if (jobData) {
          const job = JSON.parse(jobData);
          job.startedAt = new Date();
          job.status = 'processing';

          // Update job status
          await this.redis.setex(jobKey, 86400, JSON.stringify(job));

          return job;
        }
      }
    }

    return null;
  }

  /**
   * Process a job
   */
  async processJob(job: QueueJob): Promise<void> {
    try {
      console.log(`Processing job ${job.id} of type ${job.type}`);

      switch (job.type) {
        case 'exam_submission':
          await this.processBatchSubmission(job);
          break;
        case 'result_calculation':
          await this.processResultCalculation(job);
          break;
        case 'ranking_update':
          await this.processRankingUpdate(job);
          break;
        case 'analytics_refresh':
          await this.processAnalyticsRefresh(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      await this.updateJobStatus(job);

      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      job.retryCount++;
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.retryCount < job.maxRetries) {
        // Re-queue with backoff
        job.status = 'queued';
        job.createdAt = new Date(Date.now() + (job.retryCount * 60000)); // Exponential backoff
        await this.addJobToQueue(job);
      } else {
        job.status = 'failed';
        await this.updateJobStatus(job);
      }
    }
  }

  /**
   * Process batch exam submission
   */
  private async processBatchSubmission(job: QueueJob): Promise<void> {
    const submission: BatchResultSubmission = job.data;

    console.log(`Processing batch submission for exam ${submission.examId} with ${submission.submissions.length} submissions`);

    const { ResultQueryOptimizer } = await import('@/lib/db/optimized-queries');
    const { getRedisCache } = await import('@/lib/cache/redis-cache');
    const { calculateExamResult } = await import('@/lib/exams/result-calculation');
    const { resolveGradeByPercentage } = await import('@/lib/exams/grading');
    const { db } = await import('@/lib/db');

    const cache = getRedisCache();
    const results = [];

    for (let i = 0; i < submission.submissions.length; i++) {
      const sub = submission.submissions[i];

      try {
        // Calculate result
        const result = await calculateExamResult({
          userId: sub.userId,
          examId: submission.examId
        });

        // Get grade
        const grade = await resolveGradeByPercentage(result.percentage);

        // Create or update exam result
        const examResult = await db.examResult.upsert({
          where: {
            userId_examId: {
              userId: sub.userId,
              examId: submission.examId
            }
          },
          update: {
            score: result.score,
            totalMarks: result.totalMarks,
            percentage: result.percentage,
            startTime: sub.startTime,
            endTime: sub.endTime,
            isCompleted: true
          },
          create: {
            userId: sub.userId,
            examId: submission.examId,
            score: result.score,
            totalMarks: result.totalMarks,
            percentage: result.percentage,
            startTime: sub.startTime,
            endTime: sub.endTime,
            isCompleted: true
          }
        });

        // Cache the result
        await cache.cacheExamResult(submission.examId, sub.userId, examResult);

        results.push(examResult);

        // Update progress
        if (job.progress) {
          job.progress.current = i + 1;
          await this.updateJobProgress(job);
        }
      } catch (error) {
        console.error(`Failed to process submission for user ${sub.userId}:`, error);
        // Continue with other submissions
      }
    }

    // Trigger ranking and analytics updates
    if (results.length > 0) {
      await this.queueRankingUpdate(submission.examId, 'high');
      await this.queueAnalyticsRefresh('exam', submission.examId, 'normal');
    }

    console.log(`Batch submission processed: ${results.length}/${submission.submissions.length} successful`);
  }

  /**
   * Process individual result calculation
   */
  private async processResultCalculation(job: QueueJob): Promise<void> {
    const { examId, userId } = job.data;

    const { calculateExamResult } = await import('@/lib/exams/result-calculation');
    const { getRedisCache } = await import('@/lib/cache/redis-cache');
    const { db } = await import('@/lib/db');

    // Calculate result
    const result = await calculateExamResult({ userId, examId });

    // Update database
    await db.examResult.upsert({
      where: { userId_examId: { userId, examId } },
      update: {
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage
      },
      create: {
        userId,
        examId,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        startTime: new Date(),
        endTime: new Date(),
        isCompleted: true
      }
    });

    // Cache result
    const cache = getRedisCache();
    await cache.cacheExamResult(examId, userId, result);

    // Trigger dependent updates
    await this.queueRankingUpdate(examId, 'normal');
  }

  /**
   * Process ranking update
   */
  private async processRankingUpdate(job: QueueJob): Promise<void> {
    const { examId } = job.data;

    const { ResultQueryOptimizer } = await import('@/lib/db/optimized-queries');
    const { getRedisCache } = await import('@/lib/cache/redis-cache');

    // Get updated rankings
    const rankings = await ResultQueryOptimizer.getExamRankingsOptimized(examId);

    // Cache rankings
    const cache = getRedisCache();
    await cache.cacheExamRanking(examId, rankings);

    // Invalidate related caches
    await cache.invalidateRankings(examId);
  }

  /**
   * Process analytics refresh
   */
  private async processAnalyticsRefresh(job: QueueJob): Promise<void> {
    const { scope, targetId } = job.data;

    const { ResultQueryOptimizer } = await import('@/lib/db/optimized-queries');
    const { getRedisCache } = await import('@/lib/cache/redis-cache');

    const cache = getRedisCache();
    const cacheKey = `analytics_${scope}${targetId ? `_${targetId}` : ''}`;

    // Calculate analytics based on scope
    let analytics;
    switch (scope) {
      case 'exam':
        analytics = await ResultQueryOptimizer.getAnalyticsSummaryOptimized(targetId);
        break;
      case 'college':
        analytics = await ResultQueryOptimizer.getAnalyticsSummaryOptimized(undefined, targetId);
        break;
      case 'global':
        analytics = await ResultQueryOptimizer.getAnalyticsSummaryOptimized();
        break;
    }

    // Cache analytics
    await cache.cacheAnalyticsData(cacheKey, analytics);
  }

  /**
   * Update job status in Redis
   */
  private async updateJobStatus(job: QueueJob): Promise<void> {
    const jobKey = `job:${job.id}`;
    await this.redis.setex(jobKey, 86400, JSON.stringify(job));
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(job: QueueJob): Promise<void> {
    const jobKey = `job:${job.id}`;
    await this.redis.setex(jobKey, 86400, JSON.stringify(job));
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    const jobKey = `job:${jobId}`;
    const jobData = await this.redis.get(jobKey);

    if (jobData) {
      return JSON.parse(jobData);
    }

    return null;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const stats: QueueStats = {
      totalQueued: 0,
      totalProcessing: 0,
      totalCompleted: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      queueLength: 0,
      workersActive: this.workers.size
    };

    try {
      // Get queue lengths
      const queues = ['critical', 'high', 'normal', 'low'];
      for (const priority of queues) {
        const queueKey = `queue:${priority}`;
        stats.queueLength += await this.redis.zcard(queueKey);
      }

      // Get job statistics
      const jobKeys = await this.redis.keys('job:*');
      if (jobKeys.length > 0) {
        const jobs = await this.redis.mget(jobKeys);

        for (const jobData of jobs) {
          if (jobData) {
            const job = JSON.parse(jobData);
            switch (job.status) {
              case 'queued':
                stats.totalQueued++;
                break;
              case 'processing':
                stats.totalProcessing++;
                break;
              case 'completed':
                stats.totalCompleted++;
                if (job.startedAt && job.completedAt) {
                  const processingTime = job.completedAt.getTime() - job.startedAt.getTime();
                  stats.averageProcessingTime = (stats.averageProcessingTime + processingTime) / 2;
                }
                break;
              case 'failed':
                stats.totalFailed++;
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting queue stats:', error);
    }

    return stats;
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(maxAgeHours = 24): Promise<void> {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

    try {
      const jobKeys = await this.redis.keys('job:*');

      for (const jobKey of jobKeys) {
        const jobData = await this.redis.get(jobKey);
        if (jobData) {
          const job = JSON.parse(jobData);
          if ((job.status === 'completed' || job.status === 'failed') &&
              new Date(job.createdAt).getTime() < cutoffTime) {
            await this.redis.del(jobKey);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
    }
  }

  /**
   * Stop all workers gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down result processing queue...');

    for (const worker of this.workers.values()) {
      worker.stop();
    }

    this.workers.clear();
    this.isProcessing = false;
  }
}

/**
 * Worker class for processing queue jobs
 */
class Worker {
  public id: string;
  private queue: ResultProcessingQueue;
  private isRunning = false;
  private processingJob: QueueJob | null = null;

  constructor(id: string, queue: ResultProcessingQueue) {
    this.id = id;
    this.queue = queue;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log(`Worker ${this.id} started`);

    while (this.isRunning) {
      try {
        const job = await (this.queue as any).getNextJob();

        if (job) {
          this.processingJob = job;
          await this.queue.processJob(job);
          this.processingJob = null;
        } else {
          // No jobs available, wait before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Worker ${this.id} error:`, error);

        // Reset processing job on error
        this.processingJob = null;

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log(`Worker ${this.id} stopped`);
  }

  getStatus(): { isRunning: boolean; processingJob: QueueJob | null } {
    return {
      isRunning: this.isRunning,
      processingJob: this.processingJob
    };
  }
}

// Export singleton instance
export const resultProcessingQueue = ResultProcessingQueue.getInstance();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await resultProcessingQueue.shutdown();
});

process.on('SIGINT', async () => {
  await resultProcessingQueue.shutdown();
});
