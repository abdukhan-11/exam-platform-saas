import { Redis } from 'ioredis';

// Redis cache configuration
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix: string;
  ttl: {
    results: number; // seconds
    rankings: number; // seconds
    analytics: number; // seconds
    userData: number; // seconds
  };
  enableCompression: boolean;
}

export class RedisCacheManager {
  private redis: Redis;
  private config: CacheConfig;
  private isConnected = false;

  constructor(config: CacheConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,

      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,

    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('Redis cache connected successfully');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
      this.isConnected = false;
    });

    this.redis.on('ready', () => {
      console.log('Redis cache is ready');
      this.isConnected = true;
    });

    this.redis.on('close', () => {
      console.log('Redis cache connection closed');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.redis.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  // Generic cache operations
  private getCacheKey(namespace: string, key: string): string {
    return `${this.config.keyPrefix}:${namespace}:${key}`;
  }

  private async setCacheValue(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const cacheKey = this.getCacheKey('generic', key);

      if (ttl) {
        await this.redis.setex(cacheKey, ttl, serializedValue);
      } else {
        await this.redis.set(cacheKey, serializedValue);
      }
    } catch (error) {
      console.error('Error setting cache value:', error);
      // Continue without caching if Redis is unavailable
    }
  }

  private async getCacheValue<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey('generic', key);
      const value = await this.redis.get(cacheKey);

      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting cache value:', error);
      return null;
    }
  }

  // Public adapter methods used across the codebase
  async get<T = any>(key: string): Promise<T | null> {
    return this.getCacheValue<T>(key);
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    return this.setCacheValue(key, value, ttlSeconds);
  }

  private async deleteCacheValue(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey('generic', key);
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Error deleting cache value:', error);
    }
  }

  // Public, generic helpers used by other modules
  async del(key: string): Promise<void> {
    return this.deleteCacheValue(key);
  }

  // Results-specific caching
  async cacheExamResult(examId: string, userId: string, result: any): Promise<void> {
    const key = `exam_result:${examId}:${userId}`;
    await this.setCacheValue(key, result, this.config.ttl.results);
  }

  async getCachedExamResult(examId: string, userId: string): Promise<any | null> {
    const key = `exam_result:${examId}:${userId}`;
    return this.getCacheValue(key);
  }

  async invalidateExamResults(examId: string): Promise<void> {
    try {
      const pattern = this.getCacheKey('generic', `exam_result:${examId}:*`);
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating exam results:', error);
    }
  }

  async invalidateUserResults(userId: string): Promise<void> {
    try {
      const pattern = this.getCacheKey('generic', `*exam_result*:${userId}`);
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating user results:', error);
    }
  }

  // Rankings caching
  async cacheExamRanking(examId: string, ranking: any): Promise<void> {
    const key = `exam_ranking:${examId}`;
    await this.setCacheValue(key, ranking, this.config.ttl.rankings);
  }

  async getCachedExamRanking(examId: string): Promise<any | null> {
    const key = `exam_ranking:${examId}`;
    return this.getCacheValue(key);
  }

  async cacheSubjectRanking(subjectId: string, classId: string | null, ranking: any): Promise<void> {
    const key = `subject_ranking:${subjectId}${classId ? `:${classId}` : ''}`;
    await this.setCacheValue(key, ranking, this.config.ttl.rankings);
  }

  async getCachedSubjectRanking(subjectId: string, classId: string | null): Promise<any | null> {
    const key = `subject_ranking:${subjectId}${classId ? `:${classId}` : ''}`;
    return this.getCacheValue(key);
  }

  async cacheClassRanking(classId: string, ranking: any): Promise<void> {
    const key = `class_ranking:${classId}`;
    await this.setCacheValue(key, ranking, this.config.ttl.rankings);
  }

  async getCachedClassRanking(classId: string): Promise<any | null> {
    const key = `class_ranking:${classId}`;
    return this.getCacheValue(key);
  }

  async invalidateRankings(examId?: string, subjectId?: string, classId?: string): Promise<void> {
    try {
      const patterns = [];

      if (examId) {
        patterns.push(this.getCacheKey('generic', `exam_ranking:${examId}`));
      }

      if (subjectId) {
        patterns.push(this.getCacheKey('generic', `subject_ranking:${subjectId}*`));
      }

      if (classId) {
        patterns.push(this.getCacheKey('generic', `class_ranking:${classId}`));
      }

      if (patterns.length === 0) {
        // Invalidate all rankings if no specific IDs provided
        patterns.push(this.getCacheKey('generic', '*ranking*'));
      }

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Error invalidating rankings:', error);
    }
  }

  // Analytics caching
  async cacheAnalyticsData(key: string, data: any): Promise<void> {
    await this.setCacheValue(`analytics:${key}`, data, this.config.ttl.analytics);
  }

  async getCachedAnalyticsData(key: string): Promise<any | null> {
    return this.getCacheValue(`analytics:${key}`);
  }

  async invalidateAnalytics(): Promise<void> {
    try {
      const pattern = this.getCacheKey('generic', 'analytics:*');
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating analytics:', error);
    }
  }

  // User data caching
  async cacheUserData(userId: string, data: any): Promise<void> {
    await this.setCacheValue(`user:${userId}`, data, this.config.ttl.userData);
  }

  async getCachedUserData(userId: string): Promise<any | null> {
    return this.getCacheValue(`user:${userId}`);
  }

  async invalidateUserData(userId: string): Promise<void> {
    await this.deleteCacheValue(`user:${userId}`);
  }

  // Cache statistics and monitoring
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
    connected: boolean;
  }> {
    try {
      const info = await this.redis.info();
      const keyspace = await this.redis.dbsize();

      return {
        totalKeys: keyspace,
        memoryUsage: info.match(/used_memory_human:(\w+)/)?.[1] || 'Unknown',
        hitRate: 0, // Would need to implement hit/miss tracking
        connected: this.isConnected
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0,
        connected: false
      };
    }
  }

  // Batch operations for performance
  async batchSetValues(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const cacheKey = this.getCacheKey('generic', entry.key);
        const serializedValue = JSON.stringify(entry.value);

        if (entry.ttl) {
          pipeline.setex(cacheKey, entry.ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Error in batch set operation:', error);
    }
  }

  async batchGetValues<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.getCacheKey('generic', key));
      const values = await this.redis.mget(...cacheKeys);

      return values.map(value => value ? JSON.parse(value) as T : null);
    } catch (error) {
      console.error('Error in batch get operation:', error);
      return new Array(keys.length).fill(null);
    }
  }

  // Cache warming for frequently accessed data
  async warmUpCache(): Promise<void> {
    console.log('Starting cache warm-up...');

    try {
      // This would typically be called during application startup
      // to pre-load frequently accessed data

      // Warm up college data
      const colleges = await this.redis.keys(this.getCacheKey('generic', 'college:*'));
      console.log(`Found ${colleges.length} cached college entries`);

      // Warm up exam data
      const exams = await this.redis.keys(this.getCacheKey('generic', 'exam:*'));
      console.log(`Found ${exams.length} cached exam entries`);

      console.log('Cache warm-up completed');
    } catch (error) {
      console.error('Error during cache warm-up:', error);
    }
  }
}

// Singleton instance
let redisCacheInstance: RedisCacheManager | null = null;

export function getRedisCache(): RedisCacheManager {
  if (!redisCacheInstance) {
    const config: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'exam_saas',
      ttl: {
        results: 3600, // 1 hour
        rankings: 1800, // 30 minutes
        analytics: 3600, // 1 hour
        userData: 7200, // 2 hours
      },
      enableCompression: false,
    };

    redisCacheInstance = new RedisCacheManager(config);
  }

  return redisCacheInstance;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redisCacheInstance) {
    await redisCacheInstance.disconnect();
  }
});

process.on('SIGINT', async () => {
  if (redisCacheInstance) {
    await redisCacheInstance.disconnect();
  }
});
