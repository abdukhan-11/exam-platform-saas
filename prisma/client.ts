import { PrismaClient } from '@prisma/client'

// Global variable to prevent multiple instances in development
declare global {
  var __prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling and optimization
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ] : ['error'],
  // Connection pooling configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Query optimization
  errorFormat: 'pretty',
})

// Connection pooling and health check
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Note: Multi-tenant isolation is handled at the application layer
// through proper collegeId filtering in service methods

// Health check function
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date() }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date() 
    }
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Export the configured client
export default prisma

// Export types for convenience
export type { PrismaClient } from '@prisma/client'
export type { 
  User, College, Subject, Class, Exam, Question, QuestionOption,
  StudentProfile, StudentExamAttempt, StudentAnswer, Enrollment,
  TeacherClassAssignment, Event, RefreshToken, ExamResult
} from '@prisma/client'
