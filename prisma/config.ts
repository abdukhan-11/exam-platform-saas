// Database configuration for Prisma with connection pooling and optimization
export const databaseConfig = {
  // Connection pooling settings
  connectionPool: {
    // Maximum number of connections in the pool
    maxConnections: process.env.DATABASE_MAX_CONNECTIONS 
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS) 
      : 10,
    
    // Minimum number of connections to keep in the pool
    minConnections: process.env.DATABASE_MIN_CONNECTIONS 
      ? parseInt(process.env.DATABASE_MIN_CONNECTIONS) 
      : 2,
    
    // Connection timeout in milliseconds
    connectionTimeout: process.env.DATABASE_CONNECTION_TIMEOUT 
      ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) 
      : 30000,
    
    // Idle timeout in milliseconds
    idleTimeout: process.env.DATABASE_IDLE_TIMEOUT 
      ? parseInt(process.env.DATABASE_IDLE_TIMEOUT) 
      : 60000,
    
    // Maximum lifetime of a connection in milliseconds
    maxLifetime: process.env.DATABASE_MAX_LIFETIME 
      ? parseInt(process.env.DATABASE_MAX_LIFETIME) 
      : 300000, // 5 minutes
  },
  
  // Query optimization settings
  queryOptimization: {
    // Enable query logging in development
    enableQueryLogging: process.env.NODE_ENV === 'development',
    
    // Enable slow query detection (queries taking longer than this will be logged)
    slowQueryThreshold: process.env.DATABASE_SLOW_QUERY_THRESHOLD 
      ? parseInt(process.env.DATABASE_SLOW_QUERY_THRESHOLD) 
      : 1000, // 1 second
    
    // Maximum number of queries to log
    maxQueryLogs: process.env.DATABASE_MAX_QUERY_LOGS 
      ? parseInt(process.env.DATABASE_MAX_QUERY_LOGS) 
      : 100,
  },
  
  // Multi-tenant settings
  multiTenant: {
    // Enable automatic collegeId filtering
    enableAutoFiltering: process.env.ENABLE_AUTO_COLLEGE_FILTER === 'true',
    
    // Strict mode - require collegeId for all tenant-scoped queries
    strictMode: process.env.MULTI_TENANT_STRICT_MODE === 'true',
    
    // Default college ID for super admin operations
    defaultCollegeId: process.env.DEFAULT_COLLEGE_ID || null,
  },
  
  // Performance monitoring
  monitoring: {
    // Enable performance metrics collection
    enableMetrics: process.env.ENABLE_DB_METRICS === 'true',
    
    // Metrics collection interval in milliseconds
    metricsInterval: process.env.DB_METRICS_INTERVAL 
      ? parseInt(process.env.DB_METRICS_INTERVAL) 
      : 60000, // 1 minute
    
    // Enable connection pool metrics
    enableConnectionPoolMetrics: process.env.ENABLE_CONNECTION_POOL_METRICS === 'true',
  },
  
  // Security settings
  security: {
    // Enable query parameter sanitization
    enableQuerySanitization: true,
    
    // Maximum query execution time in milliseconds
    maxQueryExecutionTime: process.env.MAX_QUERY_EXECUTION_TIME 
      ? parseInt(process.env.MAX_QUERY_EXECUTION_TIME) 
      : 30000, // 30 seconds
    
    // Enable SQL injection protection
    enableSqlInjectionProtection: true,
  },
  
  // Backup and recovery
  backup: {
    // Enable automatic backup scheduling
    enableAutoBackup: process.env.ENABLE_AUTO_BACKUP === 'true',
    
    // Backup retention period in days
    backupRetentionDays: process.env.BACKUP_RETENTION_DAYS 
      ? parseInt(process.env.BACKUP_RETENTION_DAYS) 
      : 30,
    
    // Backup schedule (cron expression)
    backupSchedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  },
}

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'production':
      return {
        ...databaseConfig,
        connectionPool: {
          ...databaseConfig.connectionPool,
          maxConnections: 20,
          minConnections: 5,
          connectionTimeout: 15000,
          idleTimeout: 30000,
        },
        queryOptimization: {
          ...databaseConfig.queryOptimization,
          enableQueryLogging: false,
          slowQueryThreshold: 500,
        },
        monitoring: {
          ...databaseConfig.monitoring,
          enableMetrics: true,
          enableConnectionPoolMetrics: true,
        },
      }
      
    case 'staging':
      return {
        ...databaseConfig,
        connectionPool: {
          ...databaseConfig.connectionPool,
          maxConnections: 15,
          minConnections: 3,
        },
        monitoring: {
          ...databaseConfig.monitoring,
          enableMetrics: true,
        },
      }
      
    case 'development':
    default:
      return {
        ...databaseConfig,
        connectionPool: {
          ...databaseConfig.connectionPool,
          maxConnections: 5,
          minConnections: 1,
        },
        queryOptimization: {
          ...databaseConfig.queryOptimization,
          enableQueryLogging: true,
          slowQueryThreshold: 100,
        },
        monitoring: {
          ...databaseConfig.monitoring,
          enableMetrics: false,
        },
      }
  }
}

// Export the environment-specific configuration
export default getEnvironmentConfig()
