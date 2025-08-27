import { PrismaClient } from '@prisma/client'
import type { 
  User, College, Subject, Class, Exam, Question, 
  StudentProfile, StudentExamAttempt, StudentAnswer, 
  Enrollment, TeacherClassAssignment, Event 
} from '@prisma/client'

// Multi-tenant query helpers for automatic collegeId filtering
export class MultiTenantQueryHelper {
  constructor(private prisma: PrismaClient) {}

  // Helper to ensure collegeId is always included in tenant-scoped queries
  private ensureCollegeId<T extends { collegeId?: string }>(
    collegeId: string,
    data: T
  ): T & { collegeId: string } {
    return { ...data, collegeId } as T & { collegeId: string }
  }

  // User queries with collegeId filtering
  async findUsersByCollege(collegeId: string, options?: {
    role?: string
    isActive?: boolean
    include?: any
  }) {
    return this.prisma.user.findMany({
      where: {
        collegeId,
        ...(options?.role && { role: options.role as any }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: options?.include,
    })
  }

  // Subject queries with collegeId filtering
  async findSubjectsByCollege(collegeId: string, options?: {
    classId?: string
    isActive?: boolean
    include?: any
  }) {
    return this.prisma.subject.findMany({
      where: {
        collegeId,
        ...(options?.classId && { classId: options.classId }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: options?.include,
    })
  }

  // Class queries with collegeId filtering
  async findClassesByCollege(collegeId: string, options?: {
    academicYear?: string
    include?: any
  }) {
    return this.prisma.class.findMany({
      where: {
        collegeId,
        ...(options?.academicYear && { academicYear: options.academicYear }),
      },
      include: options?.include,
    })
  }

  // Exam queries with collegeId filtering
  async findExamsByCollege(collegeId: string, options?: {
    subjectId?: string
    classId?: string
    isActive?: boolean
    isPublished?: boolean
    include?: any
  }) {
    return this.prisma.exam.findMany({
      where: {
        collegeId,
        ...(options?.subjectId && { subjectId: options.subjectId }),
        ...(options?.classId && { classId: options.classId }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
        ...(options?.isPublished !== undefined && { isPublished: options.isPublished }),
      },
      include: options?.include,
    })
  }

  // Student profile queries with collegeId filtering
  async findStudentProfilesByCollege(collegeId: string, options?: {
    gender?: string
    include?: any
  }) {
    return this.prisma.studentProfile.findMany({
      where: {
        collegeId,
        ...(options?.gender && { gender: options.gender as any }),
      },
      include: options?.include,
    })
  }

  // Enrollment queries with collegeId filtering
  async findEnrollmentsByCollege(collegeId: string, options?: {
    status?: string
    include?: any
  }) {
    return this.prisma.enrollment.findMany({
      where: {
        class: {
          collegeId,
        },
        ...(options?.status && { status: options.status as any }),
      },
      include: {
        ...options?.include,
        class: true,
        user: true,
      },
    })
  }

  // Teacher assignment queries with collegeId filtering
  async findTeacherAssignmentsByCollege(collegeId: string, options?: {
    isActive?: boolean
    include?: any
  }) {
    return this.prisma.teacherClassAssignment.findMany({
      where: {
        class: {
          collegeId,
        },
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: {
        ...options?.include,
        teacher: true,
        class: true,
        subject: true,
      },
    })
  }

  // Event queries with collegeId filtering
  async findEventsByCollege(collegeId: string, options?: {
    type?: string
    classId?: string
    subjectId?: string
    include?: any
  }) {
    return this.prisma.event.findMany({
      where: {
        collegeId,
        ...(options?.type && { type: options.type as any }),
        ...(options?.classId && { classId: options.classId }),
        ...(options?.subjectId && { subjectId: options.subjectId }),
      },
      include: options?.include,
    })
  }

  // Exam attempt queries with collegeId filtering
  async findExamAttemptsByCollege(collegeId: string, options?: {
    examId?: string
    isCompleted?: boolean
    suspiciousActivity?: boolean
    include?: any
  }) {
    return this.prisma.studentExamAttempt.findMany({
      where: {
        exam: {
          collegeId,
        },
        ...(options?.examId && { examId: options.examId }),
        ...(options?.isCompleted !== undefined && { isCompleted: options.isCompleted }),
        ...(options?.suspiciousActivity !== undefined && { suspiciousActivity: options.suspiciousActivity }),
      },
      include: {
        ...options?.include,
        exam: true,
        user: true,
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    })
  }

  // Student answer queries with collegeId filtering
  async findStudentAnswersByCollege(collegeId: string, options?: {
    attemptId?: string
    questionId?: string
    isCorrect?: boolean
    include?: any
  }) {
    return this.prisma.studentAnswer.findMany({
      where: {
        attempt: {
          exam: {
            collegeId,
          },
        },
        ...(options?.attemptId && { attemptId: options.attemptId }),
        ...(options?.questionId && { questionId: options.questionId }),
        ...(options?.isCorrect !== undefined && { isCorrect: options.isCorrect }),
      },
      include: {
        ...options?.include,
        attempt: {
          include: {
            exam: true,
            user: true,
          },
        },
        question: true,
        selectedOption: true,
      },
    })
  }
}

// Database performance monitoring utilities
export class DatabasePerformanceMonitor {
  private queryLogs: Array<{
    query: string
    duration: number
    timestamp: Date
    model?: string
    action?: string
  }> = []

  private slowQueryThreshold: number

  constructor(slowQueryThreshold: number = 1000) {
    this.slowQueryThreshold = slowQueryThreshold
  }

  // Log a query execution
  logQuery(query: string, duration: number, model?: string, action?: string) {
    const logEntry = {
      query,
      duration,
      timestamp: new Date(),
      model,
      action,
    }

    this.queryLogs.push(logEntry)

    // Keep only the last 1000 logs
    if (this.queryLogs.length > 1000) {
      this.queryLogs = this.queryLogs.slice(-1000)
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, {
        model,
        action,
        duration,
        query: query.substring(0, 200) + '...',
      })
    }
  }

  // Get performance statistics
  getPerformanceStats() {
    if (this.queryLogs.length === 0) {
      return { totalQueries: 0, averageDuration: 0, slowQueries: 0 }
    }

    const totalQueries = this.queryLogs.length
    const totalDuration = this.queryLogs.reduce((sum, log) => sum + log.duration, 0)
    const averageDuration = totalDuration / totalQueries
    const slowQueries = this.queryLogs.filter(log => log.duration > this.slowQueryThreshold).length

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration),
      slowQueries,
      slowQueryThreshold: this.slowQueryThreshold,
    }
  }

  // Get recent slow queries
  getRecentSlowQueries(limit: number = 10) {
    return this.queryLogs
      .filter(log => log.duration > this.slowQueryThreshold)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Clear query logs
  clearLogs() {
    this.queryLogs = []
  }
}

// Helper classes are already exported above
