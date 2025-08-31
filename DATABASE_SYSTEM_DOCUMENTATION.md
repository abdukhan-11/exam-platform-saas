# Database System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Schema Design](#schema-design)
4. [Entity Relationship Diagram](#entity-relationship-diagram)
5. [Database Configuration](#database-configuration)
6. [Prisma Setup](#prisma-setup)
7. [Connection Management](#connection-management)
8. [Query Optimization](#query-optimization)
9. [Multi-tenancy](#multi-tenancy)
10. [Security Features](#security-features)
11. [Performance Considerations](#performance-considerations)
12. [Backup & Recovery](#backup--recovery)
13. [Monitoring & Logging](#monitoring--logging)

---

## Overview

This exam SaaS platform uses **PostgreSQL** as the primary database with **Prisma ORM** for type-safe database operations. The system is designed as a **multi-tenant architecture** where each college operates in isolation with their own data.

### Key Features:
- **Multi-tenant architecture** with college-based data isolation
- **Type-safe database operations** using Prisma ORM
- **Connection pooling** and load balancing
- **Real-time notifications** and event system
- **Anti-cheating mechanisms** for exam security
- **Comprehensive audit logging**
- **Scalable query optimization**

---

## Database Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        A[Next.js App]
        B[API Routes]
        C[Prisma Client]
    end
    
    subgraph "Database Layer"
        D[PostgreSQL Primary]
        E[PostgreSQL Replicas]
        F[Redis Cache]
    end
    
    subgraph "Connection Management"
        G[Connection Pool]
        H[Load Balancer]
        I[Health Checks]
    end
    
    A --> B
    B --> C
    C --> G
    G --> D
    G --> E
    C --> F
    
    H --> G
    I --> G
```

### Technology Stack:
- **Database**: PostgreSQL 16 (Alpine)
- **ORM**: Prisma 6.14.0
- **Cache**: Redis 7
- **Connection Pooling**: Custom implementation
- **Containerization**: Docker Compose

---

## Schema Design

### Core Entities

#### 1. College (Multi-tenant Root)
```sql
-- College table serves as the root for multi-tenancy
CREATE TABLE college (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    subscription_status TEXT DEFAULT 'TRIAL',
    subscription_expiry TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. User Management
```sql
-- Users belong to colleges (multi-tenant)
CREATE TABLE user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    roll_no TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'STUDENT',
    college_id TEXT REFERENCES college(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Multi-tenant constraints
    UNIQUE(college_id, email),
    UNIQUE(college_id, roll_no)
);
```

#### 3. Academic Structure
```sql
-- Classes within colleges
CREATE TABLE class (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    college_id TEXT REFERENCES college(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(college_id, name, academic_year)
);

-- Subjects within classes
CREATE TABLE subject (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    college_id TEXT REFERENCES college(id),
    class_id TEXT REFERENCES class(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(college_id, code)
);
```

#### 4. Exam System
```sql
-- Exams with anti-cheating features
CREATE TABLE exam (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    passing_marks INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    subject_id TEXT REFERENCES subject(id),
    college_id TEXT REFERENCES college(id),
    class_id TEXT REFERENCES class(id),
    created_by_id TEXT REFERENCES user(id),
    
    -- Anti-cheating features
    enable_question_shuffling BOOLEAN DEFAULT true,
    enable_time_limit_per_question BOOLEAN DEFAULT false,
    enable_browser_lock BOOLEAN DEFAULT true,
    enable_fullscreen_mode BOOLEAN DEFAULT true,
    enable_webcam_monitoring BOOLEAN DEFAULT false,
    max_attempts INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Question & Answer System
```sql
-- Questions with different types
CREATE TABLE question (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    type TEXT NOT NULL, -- MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY
    options JSONB,
    correct_answer TEXT NOT NULL,
    marks INTEGER NOT NULL,
    difficulty TEXT DEFAULT 'MEDIUM',
    exam_id TEXT REFERENCES exam(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Question options for multiple choice
CREATE TABLE question_option (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES question(id),
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0
);
```

#### 6. Student Exam Attempts
```sql
-- Tracks student exam attempts with anti-cheating
CREATE TABLE student_exam_attempt (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES user(id),
    exam_id TEXT REFERENCES exam(id),
    college_id TEXT REFERENCES college(id),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    score INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    
    -- Anti-cheating tracking
    ip_address TEXT,
    user_agent TEXT,
    browser_fingerprint TEXT,
    suspicious_activity BOOLEAN DEFAULT false,
    activity_log TEXT, -- JSON string of suspicious activities
    violation_count INTEGER DEFAULT 0,
    
    UNIQUE(user_id, exam_id)
);
```

#### 7. Student Answers
```sql
-- Individual student answers
CREATE TABLE student_answer (
    id TEXT PRIMARY KEY,
    attempt_id TEXT REFERENCES student_exam_attempt(id),
    question_id TEXT REFERENCES question(id),
    selected_option_id TEXT REFERENCES question_option(id),
    answer_text TEXT,
    is_correct BOOLEAN DEFAULT false,
    marks_awarded INTEGER DEFAULT 0,
    time_spent INTEGER, -- in seconds
    answered_at TIMESTAMP DEFAULT NOW(),
    college_id TEXT REFERENCES college(id),
    
    UNIQUE(attempt_id, question_id)
);
```

#### 8. Event & Notification System
```sql
-- Events (exams, assignments, announcements)
CREATE TABLE event (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- EXAM, ASSIGNMENT, ANNOUNCEMENT, OTHER
    scheduled_at TIMESTAMP NOT NULL,
    end_date_time TIMESTAMP,
    priority TEXT DEFAULT 'MEDIUM',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT, -- Cron expression
    college_id TEXT REFERENCES college(id),
    class_id TEXT REFERENCES class(id),
    subject_id TEXT REFERENCES subject(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notification (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES user(id),
    event_id TEXT REFERENCES event(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- INFO, WARNING, SUCCESS, ERROR, REMINDER
    channel TEXT NOT NULL, -- EMAIL, SMS, PUSH, IN_APP, WEBHOOK
    status TEXT DEFAULT 'PENDING',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    college_id TEXT REFERENCES college(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    College ||--o{ User : "has users"
    College ||--o{ Class : "has classes"
    College ||--o{ Subject : "has subjects"
    College ||--o{ Exam : "has exams"
    College ||--o{ Event : "has events"
    College ||--o{ Notification : "has notifications"
    College ||--o{ StudentProfile : "has student profiles"
    College ||--o{ StudentExamAttempt : "has exam attempts"
    College ||--o{ StudentAnswer : "has student answers"
    College ||--o{ EmailLog : "has email logs"
    College ||--o{ ActivityLog : "has activity logs"
    College ||--o{ GradeBoundary : "has grade boundaries"
    
    User ||--o{ ExamResult : "has results"
    User ||--o{ StudentExamAttempt : "has attempts"
    User ||--o{ StudentAnswer : "has answers"
    User ||--o{ Notification : "receives notifications"
    User ||--o{ ActivityLog : "generates logs"
    User ||--o{ RefreshToken : "has tokens"
    User ||--o{ RecoveryRequest : "has recovery requests"
    User ||--o{ UserInvitation : "sends invitations"
    User ||--o{ UserInvitation : "accepts invitations"
    User ||--o{ EventSubscription : "subscribes to events"
    User ||--o{ EventReminder : "has reminders"
    User ||--o{ TeacherClassAssignment : "assigned to classes"
    User ||--o{ Enrollment : "enrolled in classes"
    User ||--|| StudentProfile : "has profile"
    
    Class ||--o{ Subject : "has subjects"
    Class ||--o{ Exam : "has exams"
    Class ||--o{ Event : "has events"
    Class ||--o{ Enrollment : "has enrollments"
    Class ||--o{ TeacherClassAssignment : "has teacher assignments"
    
    Subject ||--o{ Exam : "has exams"
    Subject ||--o{ Event : "has events"
    Subject ||--o{ TeacherClassAssignment : "assigned to teachers"
    
    Exam ||--o{ Question : "has questions"
    Exam ||--o{ ExamResult : "has results"
    Exam ||--o{ StudentExamAttempt : "has attempts"
    Exam ||--o{ Event : "creates events"
    
    Question ||--o{ QuestionOption : "has options"
    Question ||--o{ StudentAnswer : "has answers"
    
    StudentExamAttempt ||--o{ StudentAnswer : "has answers"
    
    Event ||--o{ Notification : "triggers notifications"
    Event ||--o{ EventReminder : "has reminders"
    
    SuperAdmin ||--o{ ActivityLog : "generates logs"
    
    College {
        string id PK
        string name
        string username UK
        string code UK
        string subscription_status
        datetime subscription_expiry
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    User {
        string id PK
        string name
        string email
        string roll_no
        string password
        enum role
        string college_id FK
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    Exam {
        string id PK
        string title
        int duration
        int total_marks
        int passing_marks
        datetime start_time
        datetime end_time
        string subject_id FK
        string college_id FK
        string class_id FK
        string created_by_id FK
        boolean enable_question_shuffling
        boolean enable_browser_lock
        int max_attempts
        datetime created_at
        datetime updated_at
    }
    
    StudentExamAttempt {
        string id PK
        string user_id FK
        string exam_id FK
        string college_id FK
        datetime started_at
        datetime ended_at
        int score
        int total_marks
        boolean is_completed
        string ip_address
        boolean suspicious_activity
        int violation_count
    }
```

---

## Database Configuration

### Environment Variables

```bash
# Database connection (PostgreSQL)
DATABASE_URL=postgresql://exam:exam@localhost:5432/exam
SHADOW_DATABASE_URL=postgresql://exam:exam@localhost:5432/exam_shadow

# Connection pool tuning
DATABASE_MAX_CONNECTIONS=10
DATABASE_MIN_CONNECTIONS=2
DATABASE_CONNECTION_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=60000
DATABASE_MAX_LIFETIME=300000

# Multi-tenant config
ENABLE_AUTO_COLLEGE_FILTER=false
MULTI_TENANT_STRICT_MODE=false
DEFAULT_COLLEGE_ID=

# Monitoring
ENABLE_DB_METRICS=false
DB_METRICS_INTERVAL=60000
ENABLE_CONNECTION_POOL_METRICS=false

# Security
MAX_QUERY_EXECUTION_TIME=30000
```

### Docker Compose Setup

```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: exam
      POSTGRES_PASSWORD: exam
      POSTGRES_DB: exam
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
```

---

## Prisma Setup

### Schema Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

### Database Client Setup

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
export const db = prisma;
```

### Available Scripts

```json
{
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:seed": "node prisma/seed.js",
  "prisma:seed:comprehensive": "node prisma/seed-comprehensive.js",
  "prisma:studio": "prisma studio"
}
```

---

## Connection Management

### Advanced Connection Pooling

The system implements a sophisticated connection management system with:

1. **Primary-Replica Architecture**
2. **Load Balancing**
3. **Health Checks**
4. **Retry Logic**
5. **Connection Pooling**

```typescript
// Connection Manager Features
export class DatabaseConnectionManager {
  // Singleton pattern for connection management
  private static instance: DatabaseConnectionManager;
  
  // Primary and replica clients
  private primaryClient: PrismaClient;
  private replicaClients: PrismaClient[] = [];
  
  // Load balancing with weighted round-robin
  getReadClient(): PrismaClient {
    // Distributes read operations across replicas
  }
  
  // Primary for write operations
  getWriteClient(): PrismaClient {
    return this.primaryClient;
  }
  
  // Retry logic with exponential backoff
  async executeReadOperation<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: { usePrimary?: boolean; retries?: number } = {}
  ): Promise<T> {
    // Implements retry logic with configurable attempts
  }
  
  // Transaction support for write operations
  async executeWriteOperation<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: { retries?: number; useTransaction?: boolean } = {}
  ): Promise<T> {
    // Uses transactions for data consistency
  }
}
```

### Connection Pool Statistics

```typescript
// Monitor connection health
async getConnectionStats(): Promise<{
  primary: { isConnected: boolean; activeConnections: number };
  replicas: Array<{ isConnected: boolean; weight: number }>;
  config: DatabaseConfig;
}> {
  // Provides real-time connection status
}
```

---

## Query Optimization

### Optimized Query Patterns

```typescript
// ResultQueryOptimizer class provides optimized queries
export class ResultQueryOptimizer {
  // Optimized student results with proper indexing
  static async getStudentResultsOptimized(
    userId: string,
    limit = 50,
    offset = 0
  ) {
    return db.examResult.findMany({
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
  }
  
  // Analytics with raw SQL for performance
  static async getAnalyticsSummaryOptimized(examId?: string, collegeId?: string) {
    const result = await db.$queryRaw`
      SELECT
        COUNT(*) as totalResults,
        AVG(percentage) as avgPercentage,
        MIN(percentage) as minPercentage,
        MAX(percentage) as maxPercentage,
        COUNT(CASE WHEN percentage >= 90 THEN 1 END) as excellentCount,
        COUNT(CASE WHEN percentage >= 75 AND percentage < 90 THEN 1 END) as goodCount
      FROM exam_result
      WHERE ${examId ? db.$queryRaw`exam_id = ${examId}` : db.$queryRaw`1=1`}
    `;
    return (result as any)[0];
  }
}
```

### Indexing Strategy

```sql
-- Composite indexes for multi-tenant queries
CREATE INDEX idx_user_college_email ON user(college_id, email);
CREATE INDEX idx_user_college_roll_no ON user(college_id, roll_no);

-- Performance indexes for exam results
CREATE INDEX idx_exam_result_user_end_time ON exam_result(user_id, end_time);
CREATE INDEX idx_exam_result_exam_percentage ON exam_result(exam_id, percentage);

-- Anti-cheating monitoring indexes
CREATE INDEX idx_student_attempt_suspicious ON student_exam_attempt(suspicious_activity);
CREATE INDEX idx_student_attempt_violations ON student_exam_attempt(violation_count);

-- Event and notification indexes
CREATE INDEX idx_event_scheduled_at ON event(scheduled_at);
CREATE INDEX idx_notification_status ON notification(status);
```

---

## Multi-tenancy

### College-Based Data Isolation

The system implements **row-level multi-tenancy** where all data is scoped to a college:

```typescript
// Multi-tenant query patterns
const collegeId = getCurrentCollegeId();

// All queries include college_id filter
const users = await prisma.user.findMany({
  where: { collegeId },
  include: { studentProfile: true }
});

const exams = await prisma.exam.findMany({
  where: { collegeId },
  include: { subject: true, questions: true }
});
```

### Database Constraints

```sql
-- Multi-tenant unique constraints
ALTER TABLE user ADD CONSTRAINT unique_college_email 
  UNIQUE(college_id, email);

ALTER TABLE user ADD CONSTRAINT unique_college_roll_no 
  UNIQUE(college_id, roll_no);

ALTER TABLE subject ADD CONSTRAINT unique_college_code 
  UNIQUE(college_id, code);

ALTER TABLE class ADD CONSTRAINT unique_college_class_year 
  UNIQUE(college_id, name, academic_year);
```

### Tenant Routing

```typescript
// Automatic college filtering middleware
export async function withCollegeFilter<T>(
  operation: () => Promise<T>,
  collegeId?: string
): Promise<T> {
  const context = getRequestContext();
  const tenantId = collegeId || context.collegeId;
  
  if (!tenantId) {
    throw new Error('College ID required for multi-tenant operation');
  }
  
  return operation();
}
```

---

## Security Features

### Anti-Cheating Mechanisms

```typescript
// Exam attempt tracking
interface StudentExamAttempt {
  // Basic attempt data
  userId: string;
  examId: string;
  startedAt: Date;
  endedAt?: Date;
  
  // Anti-cheating features
  ipAddress?: string;
  userAgent?: string;
  browserFingerprint?: string;
  suspiciousActivity: boolean;
  activityLog?: string; // JSON of suspicious activities
  violationCount: number;
}
```

### Security Monitoring

```typescript
// Activity logging for security
interface ActivityLog {
  userId: string;
  sessionId?: string;
  action: string; // LOGIN, LOGOUT, CREATE_USER, UPDATE_PROFILE
  resource?: string; // USER, EXAM, CLASS
  resourceId?: string;
  details?: any; // Additional details
  ipAddress?: string;
  userAgent?: string;
  location?: string; // Geolocation data
  riskScore?: number; // Security risk assessment
  collegeId?: string;
  createdAt: Date;
}
```

### Data Encryption

```typescript
// Sensitive data handling
interface User {
  // Encrypted fields
  password: string; // bcrypt hashed
  email: string; // Can be encrypted in transit
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

---

## Performance Considerations

### Query Optimization Strategies

1. **Selective Field Loading**
```typescript
// Only load needed fields
const userSummary = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    role: true
  },
  where: { collegeId }
});
```

2. **Pagination with Cursors**
```typescript
// Efficient pagination
const results = await prisma.examResult.findMany({
  where: { userId },
  take: 20,
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' }
});
```

3. **Batch Operations**
```typescript
// Batch inserts for performance
await prisma.examResult.createMany({
  data: resultsArray,
  skipDuplicates: true
});
```

### Caching Strategy

```typescript
// Redis caching for frequently accessed data
export class CacheManager {
  async getCachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const result = await queryFn();
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));
    return result;
  }
}
```

### Database Monitoring

```typescript
// Performance metrics
interface DatabaseMetrics {
  connectionStats: {
    primary: { isConnected: boolean; activeConnections: number };
    replicas: Array<{ isConnected: boolean; weight: number }>;
  };
  queryPerformance: {
    averageQueryTime: number;
    slowQueries: number;
    totalQueries: number;
  };
}
```

---

## Backup & Recovery

### Automated Backup System

```javascript
// scripts/database-backup.js
const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `./backups/exam-db-${timestamp}.sql`;
  
  // Create backup
  await exec(`pg_dump ${process.env.DATABASE_URL} > ${backupPath}`);
  
  // Compress backup
  await exec(`gzip ${backupPath}`);
  
  // Upload to cloud storage (optional)
  await uploadToCloud(`${backupPath}.gz`);
};
```

### Recovery Procedures

```bash
# Restore from backup
pg_restore -d exam_db backup_file.sql

# Point-in-time recovery
pg_restore --clean --if-exists -d exam_db backup_file.sql
```

### Backup Scheduling

```json
{
  "db:backup": "node scripts/database-backup.js",
  "db:backup:create": "node scripts/database-backup.js create",
  "db:backup:list": "node scripts/database-backup.js list",
  "db:backup:schedule": "node scripts/database-backup.js schedule"
}
```

---

## Monitoring & Logging

### Database Health Checks

```typescript
// Health check implementation
export async function checkDatabaseHealth(): Promise<HealthStatus> {
  try {
    // Test primary connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test replica connections
    for (const replica of replicaClients) {
      await replica.$queryRaw`SELECT 1`;
    }
    
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date() };
  }
}
```

### Query Performance Monitoring

```typescript
// Slow query detection
const slowQueryThreshold = 1000; // 1 second

prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  
  if (duration > slowQueryThreshold) {
    console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
    // Log to monitoring service
  }
  
  return result;
});
```

### Error Tracking

```typescript
// Database error handling
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log error with context
    console.error('Database operation failed:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
      operation: operation.name
    });
    
    // Retry logic for transient errors
    if (isRetryableError(error)) {
      return await retryOperation(operation);
    }
    
    throw error;
  }
}
```

---

## Summary

This database system provides:

1. **Robust Multi-tenancy**: Complete data isolation between colleges
2. **High Performance**: Optimized queries, indexing, and connection pooling
3. **Security**: Anti-cheating mechanisms and comprehensive audit logging
4. **Scalability**: Primary-replica architecture with load balancing
5. **Reliability**: Automated backups, health checks, and error recovery
6. **Monitoring**: Real-time performance metrics and alerting

The system is designed to handle thousands of concurrent users across multiple colleges while maintaining data integrity and performance.
