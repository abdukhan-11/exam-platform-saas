import { PrismaClient } from '@prisma/client';

// Database connection configuration
export interface DatabaseConfig {
  primary: {
    url: string;
    maxConnections: number;
    minConnections: number;
  };
  replicas?: Array<{
    url: string;
    weight: number;
  }>;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
}

// Connection pool manager for database operations
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private primaryClient: PrismaClient;
  private replicaClients: PrismaClient[] = [];
  private replicaWeights: number[] = [];
  private config: DatabaseConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  private constructor(config: DatabaseConfig) {
    this.config = config;
    this.primaryClient = new PrismaClient({
      datasourceUrl: config.primary.url,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });

    this.initializeReplicas();
    this.startHealthChecks();
  }

  static getInstance(config?: DatabaseConfig): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      const defaultConfig: DatabaseConfig = {
        primary: {
          url: process.env.DATABASE_URL || 'file:./dev.db',
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
          minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
        },
        replicas: process.env.DATABASE_REPLICAS ? JSON.parse(process.env.DATABASE_REPLICAS) : undefined,
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
        healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
      };

      DatabaseConnectionManager.instance = new DatabaseConnectionManager(config || defaultConfig);
    }
    return DatabaseConnectionManager.instance;
  }

  private initializeReplicas(): void {
    if (!this.config.replicas || this.config.replicas.length === 0) {
      return;
    }

    for (const replica of this.config.replicas) {
      const client = new PrismaClient({
        datasourceUrl: replica.url,
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
      });

      this.replicaClients.push(client);
      this.replicaWeights.push(replica.weight);
    }

    console.log(`Initialized ${this.replicaClients.length} database replicas`);
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        // Health check primary
        await this.primaryClient.$queryRaw`SELECT 1`;

        // Health check replicas
        for (let i = 0; i < this.replicaClients.length; i++) {
          try {
            await this.replicaClients[i].$queryRaw`SELECT 1`;
          } catch (error) {
            console.warn(`Replica ${i} health check failed:`, error);
            // Could implement replica failover logic here
          }
        }
      } catch (error) {
        console.error('Database health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Get a database client for read operations (load balanced across replicas)
   */
  getReadClient(): PrismaClient {
    if (this.replicaClients.length === 0) {
      return this.primaryClient;
    }

    // Simple weighted round-robin load balancing
    const totalWeight = this.replicaWeights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;

    let weightSum = 0;
    for (let i = 0; i < this.replicaClients.length; i++) {
      weightSum += this.replicaWeights[i];
      if (random <= weightSum) {
        return this.replicaClients[i];
      }
    }

    // Fallback to first replica
    return this.replicaClients[0];
  }

  /**
   * Get the primary database client for write operations
   */
  getWriteClient(): PrismaClient {
    return this.primaryClient;
  }

  /**
   * Execute a read operation with retry logic
   */
  async executeReadOperation<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: { usePrimary?: boolean; retries?: number } = {}
  ): Promise<T> {
    const { usePrimary = false, retries = this.config.retryAttempts } = options;
    const client = usePrimary ? this.primaryClient : this.getReadClient();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.withTimeout(operation(client), this.config.queryTimeout);
      } catch (error) {
        console.warn(`Read operation attempt ${attempt + 1} failed:`, error);

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt)));
      }
    }

    throw new Error('All read operation attempts failed');
  }

  /**
   * Execute a write operation with retry logic and transaction support
   */
  async executeWriteOperation<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: { retries?: number; useTransaction?: boolean } = {}
  ): Promise<T> {
    const { retries = this.config.retryAttempts, useTransaction = true } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (useTransaction) {
          return await this.primaryClient.$transaction(async (tx) => {
            const result = await this.withTimeout(operation(tx as any), this.config.queryTimeout);
            return result;
          });
        } else {
          return await this.withTimeout(operation(this.primaryClient), this.config.queryTimeout);
        }
      } catch (error) {
        console.warn(`Write operation attempt ${attempt + 1} failed:`, error);

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt)));
      }
    }

    throw new Error('All write operation attempts failed');
  }

  /**
   * Execute a batch operation with connection pooling
   */
  async executeBatchOperation<T>(
    operations: Array<(client: PrismaClient) => Promise<T>>,
    options: { batchSize?: number; useTransaction?: boolean } = {}
  ): Promise<T[]> {
    const { batchSize = 5, useTransaction = true } = options;
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(operation =>
          useTransaction
            ? this.executeWriteOperation(operation)
            : this.executeReadOperation(operation, { usePrimary: true })
        )
      );

      // Process batch results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch operation failed:', result.reason);
          // Could implement error handling strategy here
        }
      }
    }

    return results;
  }

  /**
   * Add timeout to operations
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionStats(): Promise<{
    primary: {
      isConnected: boolean;
      activeConnections: number;
    };
    replicas: Array<{
      isConnected: boolean;
      weight: number;
    }>;
    config: DatabaseConfig;
  }> {
    const stats = {
      primary: {
        isConnected: false,
        activeConnections: 0
      },
      replicas: [] as Array<{
        isConnected: boolean;
        weight: number;
      }>,
      config: this.config
    };

    // Check primary connection
    try {
      await this.primaryClient.$queryRaw`SELECT 1`;
      stats.primary.isConnected = true;
      stats.primary.activeConnections = 1; // Simplified - in production you'd track actual connection count
    } catch (error) {
      console.error('Primary connection check failed:', error);
    }

    // Check replica connections
    for (let i = 0; i < this.replicaClients.length; i++) {
      try {
        await this.replicaClients[i].$queryRaw`SELECT 1`;
        stats.replicas.push({
          isConnected: true,
          weight: this.replicaWeights[i]
        });
      } catch (error) {
        console.error(`Replica ${i} connection check failed:`, error);
        stats.replicas.push({
          isConnected: false,
          weight: this.replicaWeights[i]
        });
      }
    }

    return stats;
  }

  /**
   * Optimize connection pool settings based on load
   */
  async optimizeConnections(loadFactor: number): Promise<void> {
    // This would typically adjust connection pool sizes based on current load
    // For now, we'll just log the optimization attempt
    console.log(`Optimizing database connections for load factor: ${loadFactor}`);

    // In a real implementation, you might:
    // - Increase connection pool size during peak hours
    // - Decrease during low-traffic periods
    // - Add/remove replica connections based on demand
    // - Adjust timeouts based on query patterns
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down database connection manager...');
    this.isShuttingDown = true;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    try {
      await this.primaryClient.$disconnect();

      for (const replica of this.replicaClients) {
        await replica.$disconnect();
      }

      console.log('All database connections closed successfully');
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  }
}

// Connection-aware database operations wrapper
export class DatabaseOperations {
  private manager: DatabaseConnectionManager;

  constructor(manager?: DatabaseConnectionManager) {
    this.manager = manager || DatabaseConnectionManager.getInstance();
  }

  /**
   * Execute a read query with automatic retry and load balancing
   */
  async read<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return this.manager.executeReadOperation(operation);
  }

  /**
   * Execute a write query with transaction support and retry
   */
  async write<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return this.manager.executeWriteOperation(operation);
  }

  /**
   * Execute multiple read operations in parallel with load balancing
   */
  async readBatch<T>(operations: Array<(client: PrismaClient) => Promise<T>>): Promise<T[]> {
    return this.manager.executeBatchOperation(operations, { useTransaction: false });
  }

  /**
   * Execute multiple write operations in batch with transaction support
   */
  async writeBatch<T>(operations: Array<(client: PrismaClient) => Promise<T>>): Promise<T[]> {
    return this.manager.executeBatchOperation(operations, { useTransaction: true });
  }

  /**
   * Get database performance metrics
   */
  async getMetrics(): Promise<{
    connectionStats: any;
    queryPerformance: {
      averageQueryTime: number;
      slowQueries: number;
      totalQueries: number;
    };
  }> {
    const connectionStats = await this.manager.getConnectionStats();

    // In a real implementation, you'd collect actual query performance metrics
    const queryPerformance = {
      averageQueryTime: 0, // Would be calculated from actual metrics
      slowQueries: 0, // Would count queries taking > 1000ms
      totalQueries: 0 // Would be a running count
    };

    return {
      connectionStats,
      queryPerformance
    };
  }
}

// Singleton instances
export const dbConnectionManager = DatabaseConnectionManager.getInstance();
export const dbOperations = new DatabaseOperations();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await dbConnectionManager.shutdown();
});

process.on('SIGINT', async () => {
  await dbConnectionManager.shutdown();
});

// Export optimized database operations for common use cases
export const optimizedDb = {
  // Read operations (use replicas when available)
  async getStudentResults(userId: string, limit = 50, offset = 0) {
    return dbOperations.read(async (client) => {
      return client.examResult.findMany({
        where: { userId },
        select: {
          id: true,
          examId: true,
          score: true,
          totalMarks: true,
          percentage: true,
          endTime: true,
          exam: {
            select: {
              title: true,
              subjectId: true,
              subject: { select: { name: true } }
            }
          }
        },
        orderBy: { endTime: 'desc' },
        take: limit,
        skip: offset
      });
    });
  },

  // Write operations (always use primary)
  async createExamResult(data: any) {
    return dbOperations.write(async (client) => {
      return client.examResult.create({ data });
    });
  },

  // Batch operations for performance
  async createExamResultsBatch(results: any[]) {
    return dbOperations.writeBatch(
      results.map(result => (client: any) => client.examResult.create({ data: result }))
    );
  },

  // Analytics queries (read-heavy, use replicas)
  async getAnalyticsSummary(examId?: string, collegeId?: string) {
    return dbOperations.read(async (client) => {
      const where: any = {};
      if (examId) where.examId = examId;
      if (collegeId) where.exam = { collegeId };

      const results = await client.examResult.findMany({
        where,
        select: { percentage: true, score: true, totalMarks: true }
      });

      if (results.length === 0) return null;

      const percentages = results.map(r => r.percentage);
      return {
        totalResults: results.length,
        averagePercentage: percentages.reduce((sum, p) => sum + p, 0) / percentages.length,
        minPercentage: Math.min(...percentages),
        maxPercentage: Math.max(...percentages)
      };
    });
  }
};
