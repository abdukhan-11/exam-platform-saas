import { db } from '@/lib/db';
import { getRedisCache } from '@/lib/cache/redis-cache';

export interface ExamSession {
  examId: string;
  studentId: string;
  socketId: string;
  startedAt: Date;
  lastActivity: Date;
  status: 'active' | 'completed' | 'disconnected' | 'suspended';
  progress: {
    totalQuestions: number;
    answeredQuestions: number;
    timeSpent: number;
    currentQuestion?: string;
  };
  activityLog: Array<{
    action: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>;
}

export interface ExamStatus {
  examId: string;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  disconnectedStudents: number;
  averageProgress: number;
  alertsCount: number;
  startTime: Date;
  endTime: Date;
  timeRemaining: number;
}

/**
 * Exam Session Manager - Manages real-time exam sessions and student activity
 */
export class ExamSessionManager {
  private static instance: ExamSessionManager;
  private sessions: Map<string, ExamSession> = new Map();
  private redis = getRedisCache();

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000); // 5 minutes
  }

  static getInstance(): ExamSessionManager {
    if (!ExamSessionManager.instance) {
      ExamSessionManager.instance = new ExamSessionManager();
    }
    return ExamSessionManager.instance;
  }

  /**
   * Start a new student exam session
   */
  async startStudentSession(examId: string, studentId: string, socketId: string): Promise<void> {
    try {
      // Get exam details
      const exam = await db.exam.findUnique({
        where: { id: examId },
        include: { questions: true }
      });

      if (!exam) {
        throw new Error('Exam not found');
      }

      // Check if student already has an active session
      const existingSessionKey = `${examId}_${studentId}`;
      const existingSession = this.sessions.get(existingSessionKey);

      if (existingSession && existingSession.status === 'active') {
        // Resume existing session
        existingSession.socketId = socketId;
        existingSession.lastActivity = new Date();
        existingSession.status = 'active';
        await this.saveSessionToRedis(existingSession);
        return;
      }

      // Create new session
      const session: ExamSession = {
        examId,
        studentId,
        socketId,
        startedAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        progress: {
          totalQuestions: exam.questions.length,
          answeredQuestions: 0,
          timeSpent: 0
        },
        activityLog: [{
          action: 'session_started',
          timestamp: new Date(),
          data: { socketId, examTitle: exam.title }
        }]
      };

      this.sessions.set(existingSessionKey, session);
      await this.saveSessionToRedis(session);

      // Update or create StudentExamAttempt record
      await this.updateStudentAttempt(examId, studentId, session);

      console.log(`📝 Started exam session for student ${studentId} in exam ${examId}`);

    } catch (error) {
      console.error('Error starting student session:', error);
      throw error;
    }
  }

  /**
   * Update student activity in exam session
   */
  async updateStudentActivity(
    examId: string,
    studentId: string,
    activity: { action: string; data?: Record<string, unknown> }
  ): Promise<void> {
    const sessionKey = `${examId}_${studentId}`;
    const session = this.sessions.get(sessionKey);

    if (!session) {
      console.warn(`Session not found for ${sessionKey}`);
      return;
    }

    // Update session data
    session.lastActivity = new Date();
    session.activityLog.push({
      action: String(activity.action),
      timestamp: new Date(),
      data: activity.data as Record<string, unknown> | undefined,
    });

    // Update progress based on activity type
    if (activity.action === 'question_answered') {
      session.progress.answeredQuestions = Math.max(
        session.progress.answeredQuestions,
        Number((activity.data as any)?.questionNumber) || 0
      );
    }

    if (activity.action === 'time_update') {
      session.progress.timeSpent = Number((activity.data as any)?.timeSpent) || 0;
    }

    if (activity.action === 'question_viewed') {
      session.progress.currentQuestion = String((activity.data as any)?.questionId);
    }

    await this.saveSessionToRedis(session);
  }

  /**
   * Handle student disconnection
   */
  async handleStudentDisconnect(examId: string, studentId: string): Promise<void> {
    const sessionKey = `${examId}_${studentId}`;
    const session = this.sessions.get(sessionKey);

    if (session) {
      session.status = 'disconnected';
      session.lastActivity = new Date();
      session.activityLog.push({
        action: 'disconnected',
        timestamp: new Date()
      });

      await this.saveSessionToRedis(session);
      console.log(`🔌 Student ${studentId} disconnected from exam ${examId}`);
    }
  }

  /**
   * Submit exam for a student
   */
  async submitExam(examId: string, studentId: string, submissionData: Record<string, unknown>): Promise<void> {
    const sessionKey = `${examId}_${studentId}`;
    const session = this.sessions.get(sessionKey);

    if (session) {
      session.status = 'completed';
      session.progress.answeredQuestions = Number((submissionData as any)?.answeredCount) || session.progress.answeredQuestions;
      session.activityLog.push({
        action: 'exam_submitted',
        timestamp: new Date(),
        data: { submissionData }
      });

      await this.saveSessionToRedis(session);
      await this.finalizeStudentAttempt(examId, studentId, session, submissionData);

      // Remove from active sessions
      this.sessions.delete(sessionKey);

      console.log(`✅ Student ${studentId} completed exam ${examId}`);
    }
  }

  /**
   * Get current exam status for monitoring dashboard
   */
  async getExamStatus(examId: string): Promise<ExamStatus> {
    try {
      const exam = await db.exam.findUnique({
        where: { id: examId },
        include: {
          attempts: {
            where: { isCompleted: true },
            select: { userId: true }
          },
          _count: {
            select: { attempts: true }
          }
        }
      });

      if (!exam) {
        throw new Error('Exam not found');
      }

      // Get active sessions for this exam
      const activeSessions = Array.from(this.sessions.values())
        .filter(session => session.examId === examId && session.status === 'active');

      const disconnectedSessions = Array.from(this.sessions.values())
        .filter(session => session.examId === examId && session.status === 'disconnected');

      // Calculate average progress
      const totalProgress = activeSessions.reduce((sum, session) =>
        sum + (session.progress.answeredQuestions / session.progress.totalQuestions), 0
      );
      const averageProgress = activeSessions.length > 0 ? totalProgress / activeSessions.length : 0;

      // Get alerts count (this would come from a separate service)
      const alertsCount = await this.getAlertsCount(examId);

      const now = new Date();
      const timeRemaining = Math.max(0, exam.endTime.getTime() - now.getTime());

      return {
        examId,
        totalStudents: exam._count.attempts,
        activeStudents: activeSessions.length,
        completedStudents: exam.attempts.length,
        disconnectedStudents: disconnectedSessions.length,
        averageProgress: Math.round(averageProgress * 100),
        alertsCount,
        startTime: exam.startTime,
        endTime: exam.endTime,
        timeRemaining
      };

    } catch (error) {
      console.error('Error getting exam status:', error);
      throw error;
    }
  }

  /**
   * Get active sessions for an exam
   */
  getActiveSessions(examId: string): ExamSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.examId === examId && session.status === 'active');
  }

  /**
   * Get all sessions for an exam (including completed)
   */
  async getAllSessions(examId: string): Promise<ExamSession[]> {
    // Get from memory (active sessions)
    const activeSessions = this.getActiveSessions(examId);

    // Get from Redis (recently completed sessions)
    try {
      const redisKey = `exam_sessions_${examId}`;
      const cachedSessions = await this.redis.get(redisKey) as ExamSession[] || [];
      return [...activeSessions, ...cachedSessions];
    } catch (error) {
      console.warn('Could not get cached sessions:', error);
      return activeSessions;
    }
  }

  /**
   * Get student session
   */
  getStudentSession(examId: string, studentId: string): ExamSession | null {
    const sessionKey = `${examId}_${studentId}`;
    return this.sessions.get(sessionKey) || null;
  }

  /**
   * Force suspend a student session (for cheating or admin action)
   */
  async suspendStudentSession(examId: string, studentId: string, reason: string): Promise<void> {
    const sessionKey = `${examId}_${studentId}`;
    const session = this.sessions.get(sessionKey);

    if (session) {
      session.status = 'suspended';
      session.activityLog.push({
        action: 'session_suspended',
        timestamp: new Date(),
        data: { reason }
      });

      await this.saveSessionToRedis(session);
      console.log(`🚫 Suspended session for student ${studentId} in exam ${examId}: ${reason}`);
    }
  }

  /**
   * Resume a suspended student session
   */
  async resumeStudentSession(examId: string, studentId: string): Promise<void> {
    const sessionKey = `${examId}_${studentId}`;
    const session = this.sessions.get(sessionKey);

    if (session && session.status === 'suspended') {
      session.status = 'active';
      session.activityLog.push({
        action: 'session_resumed',
        timestamp: new Date()
      });

      await this.saveSessionToRedis(session);
      console.log(`▶️ Resumed session for student ${studentId} in exam ${examId}`);
    }
  }

  /**
   * Save session to Redis for persistence and cross-server access
   */
  private async saveSessionToRedis(session: ExamSession): Promise<void> {
    try {
      const redisKey = `exam_session_${session.examId}_${session.studentId}`;
      await this.redis.set(redisKey, session, 60 * 60 * 24); // 24 hours

      // Also save to exam sessions list
      const listKey = `exam_sessions_${session.examId}`;
      const sessions = await this.redis.get(listKey) as ExamSession[] || [];
      const updatedSessions = sessions.filter(s => s.studentId !== session.studentId);
      updatedSessions.push(session);
      await this.redis.set(listKey, updatedSessions, 60 * 60 * 24);

    } catch (error) {
      console.warn('Could not save session to Redis:', error);
    }
  }

  /**
   * Update StudentExamAttempt record
   */
  private async updateStudentAttempt(examId: string, studentId: string, session: ExamSession): Promise<void> {
    try {
      const attempt = await db.studentExamAttempt.upsert({
        where: {
          userId_examId: {
            userId: studentId,
            examId: examId
          }
        },
        update: {
          startedAt: session.startedAt,
          score: session.progress.answeredQuestions,
          totalMarks: session.progress.totalQuestions,
          isCompleted: false,
          ipAddress: 'tracked-via-socket', // Would be tracked separately
          userAgent: 'tracked-via-socket',
          suspiciousActivity: false, // Will be updated by cheating detection
          activityLog: JSON.stringify(session.activityLog)
        },
        create: {
          userId: studentId,
          examId: examId,
          startedAt: session.startedAt,
          score: 0,
          totalMarks: session.progress.totalQuestions,
          isCompleted: false,
          ipAddress: 'tracked-via-socket',
          userAgent: 'tracked-via-socket',
          suspiciousActivity: false,
          activityLog: JSON.stringify(session.activityLog)
        }
      });

      console.log(`📝 Updated attempt record for student ${studentId} in exam ${examId}`);
    } catch (error) {
      console.error('Error updating student attempt:', error);
    }
  }

  /**
   * Finalize student attempt when exam is submitted
   */
  private async finalizeStudentAttempt(
    examId: string,
    studentId: string,
    session: ExamSession,
    submissionData: Record<string, unknown>
  ): Promise<void> {
    try {
      await db.studentExamAttempt.update({
        where: {
          userId_examId: {
            userId: studentId,
            examId: examId
          }
        },
        data: {
          endedAt: new Date(),
          score: submissionData.score || session.progress.answeredQuestions,
          isCompleted: true,
          activityLog: JSON.stringify(session.activityLog)
        }
      });

      console.log(`✅ Finalized attempt record for student ${studentId} in exam ${examId}`);
    } catch (error) {
      console.error('Error finalizing student attempt:', error);
    }
  }

  /**
   * Get alerts count for an exam
   */
  private async getAlertsCount(examId: string): Promise<number> {
    try {
      // This would integrate with the cheating detection service
      // For now, return a placeholder
      return 0;
    } catch (error) {
      console.warn('Could not get alerts count:', error);
      return 0;
    }
  }

  /**
   * Clean up inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const timeoutMs = 30 * 60 * 1000; // 30 minutes

    for (const [sessionKey, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > timeoutMs) {
        console.log(`🧹 Cleaning up inactive session for student ${session.studentId} in exam ${session.examId}`);

        session.status = 'disconnected';
        session.activityLog.push({
          action: 'session_timeout',
          timestamp: new Date()
        });

        await this.saveSessionToRedis(session);
        this.sessions.delete(sessionKey);
      }
    }
  }

  /**
   * Get session statistics for monitoring
   */
  getSessionStats(): {
    totalActiveSessions: number;
    totalDisconnectedSessions: number;
    totalSuspendedSessions: number;
    sessionsByExam: Record<string, number>;
  } {
    const stats = {
      totalActiveSessions: 0,
      totalDisconnectedSessions: 0,
      totalSuspendedSessions: 0,
      sessionsByExam: {} as Record<string, number>
    };

    for (const session of this.sessions.values()) {
      if (session.status === 'active') stats.totalActiveSessions++;
      else if (session.status === 'disconnected') stats.totalDisconnectedSessions++;
      else if (session.status === 'suspended') stats.totalSuspendedSessions++;

      stats.sessionsByExam[session.examId] = (stats.sessionsByExam[session.examId] || 0) + 1;
    }

    return stats;
  }
}
