import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
// Redis adapter is optional. We'll dynamically import to avoid build-time dependency.
import { db } from './db';
import { ExamSessionManager } from './exams/exam-session-manager';
import { CheatingDetectionService } from './security/cheating-detection';
import { NotificationService } from './notifications/notification-service';
import { ExamMonitoringData } from './types/exam-monitoring';
import { verifyAccessToken } from '@/lib/auth/token-service';

// Socket.io server instance
let io: SocketIOServer | null = null;

// Exam monitoring namespaces
const EXAM_NAMESPACE = '/exam-monitoring';
const STUDENT_NAMESPACE = '/student-exam';

// Connection tracking
const connectedUsers = new Map<string, {
  userId: string;
  examId?: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
}>();

// Re-export types for backward compatibility
export type { ExamMonitoringData, CheatingAlert } from './types/exam-monitoring';

/**
 * Initialize Socket.io server with Redis adapter for scaling
 */
export async function initializeSocketServer(httpServer: HTTPServer): Promise<SocketIOServer> {
  if (io) {
    return io;
  }

  // Initialize Socket.io server
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8, // 100MB for file uploads
    connectTimeout: 45000,
  });

  // Optional Redis adapter for scaling is intentionally omitted unless explicitly configured

  // Initialize services
  const examSessionManager = ExamSessionManager.getInstance();
  const cheatingDetectionService = CheatingDetectionService.getInstance();
  const notificationService = NotificationService.getInstance();

  // Set up middleware for authentication
  io.use(async (socket: Socket, next) => {
    try {
      const token = (socket.handshake.auth && (socket.handshake.auth as any).token) || (socket.handshake.query && (socket.handshake.query as any).token);
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token required'));
      }

      // Verify user authentication using our JWT service
      const payload = verifyAccessToken(token);
      if (!payload?.id) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = payload.id;
      socket.data.connectedAt = new Date();

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Set up exam monitoring namespace
  const examMonitoringNamespace = io.of(EXAM_NAMESPACE);

  examMonitoringNamespace.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`👨‍🏫 Teacher ${userId} connected to exam monitoring`);

    // Join teacher's monitoring room
    socket.join(`teacher_${userId}`);

    // Handle exam monitoring subscription
    socket.on('subscribe-exam', async (examId: string) => {
      try {
        // Verify teacher has access to this exam
        const exam = await db.exam.findUnique({
          where: { id: examId },
          include: { college: true }
        });

        if (!exam) {
          socket.emit('error', { message: 'Exam not found' });
          return;
        }

        // Check if user is a teacher/admin with access to this exam
        const user = await db.user.findUnique({
          where: { id: userId }
        });

        if (!user || (user.role !== 'TEACHER' && user.role !== 'COLLEGE_ADMIN' && user.role !== 'SUPER_ADMIN')) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        if (user.role !== 'SUPER_ADMIN' && exam.collegeId !== user.collegeId) {
          socket.emit('error', { message: 'Forbidden' });
          return;
        }

        socket.join(`exam_${examId}`);
        console.log(`👨‍🏫 Teacher ${userId} subscribed to exam ${examId}`);

        // Send current exam status
        const currentStatus = await examSessionManager.getExamStatus(examId);
        socket.emit('exam-status', currentStatus);

      } catch (error) {
        console.error('Error subscribing to exam:', error);
        socket.emit('error', { message: 'Failed to subscribe to exam' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`👨‍🏫 Teacher ${userId} disconnected from exam monitoring`);
    });
  });

  // Set up student exam namespace
  const studentExamNamespace = io.of(STUDENT_NAMESPACE);

  studentExamNamespace.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`👨‍🎓 Student ${userId} connected to exam`);

    // Track connection
    connectedUsers.set(socket.id, {
      userId,
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Handle exam session join
    socket.on('join-exam', async (examId: string, ack?: (response: { ok?: boolean; error?: string }) => void) => {
      try {
        // Verify student has access to this exam
        const exam = await db.exam.findUnique({
          where: { id: examId },
          include: { class: true }
        });

        if (!exam) {
          socket.emit('error', { message: 'Exam not found' });
          return;
        }

        // Ensure student is enrolled in the exam's class
        if (!exam.classId) {
          socket.emit('error', { message: 'Exam class not found' });
          return;
        }
        const isEnrolled = await db.enrollment.findFirst({
          where: { userId, classId: exam.classId }
        });
        if (!isEnrolled) {
          socket.emit('error', { message: 'Not enrolled in this exam' });
          return;
        }

        // Check if exam is active and within time limits
        const now = new Date();
        if (now < exam.startTime || now > exam.endTime) {
          socket.emit('error', { message: 'Exam is not currently active' });
          return;
        }

        // Join exam room
        socket.join(`exam_${examId}`);
        socket.data.examId = examId;

        // Update connection tracking
        const connection = connectedUsers.get(socket.id);
        if (connection) {
          connection.examId = examId;
          connection.lastActivity = new Date();
        }

        // Start exam session tracking
        await examSessionManager.startStudentSession(examId, userId, socket.id);

        // Notify monitoring dashboard
        examMonitoringNamespace.to(`exam_${examId}`).emit('student-joined', {
          examId,
          userId,
          socketId: socket.id,
          timestamp: new Date()
        });

        console.log(`👨‍🎓 Student ${userId} joined exam ${examId}`);
        if (ack) ack({ ok: true });

      } catch (error) {
        console.error('Error joining exam:', error);
        if (ack) ack({ error: 'Failed to join exam' });
        else socket.emit('error', { message: 'Failed to join exam' });
      }
    });

    // Handle student activity monitoring
    socket.on('activity-update', async (payload: any) => {
      try {
        const connection = connectedUsers.get(socket.id);
        if (!connection?.examId) return;

        // Update last activity
        connection.lastActivity = new Date();

        // Normalize to an array of activities (support single or batched payloads)
        const activities = Array.isArray(payload?.activities) ? payload.activities : [payload];

        for (const activity of activities) {
          const data: ExamMonitoringData = {
            examId: connection.examId!,
            userId,
            action: activity.action,
            data: activity.data || {},
            timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
          };

          // Process activity for cheating detection
          const alert = await cheatingDetectionService.analyzeActivity(data);

          if (alert) {
            // Send alert to monitoring dashboard
            examMonitoringNamespace.to(`exam_${data.examId}`).emit('cheating-alert', alert);

            // Send notification to teachers
            await notificationService.sendCheatingAlert(alert);
          }

          // Update session activity
          await examSessionManager.updateStudentActivity(data.examId, data.userId, { action: String(data.action), data: (data as any).data || {} });
        }

      } catch (error) {
        console.error('Error processing activity update:', error);
      }
    });

    // Handle exam submission
    socket.on('submit-exam', async (submissionData: Record<string, unknown>, ack?: (response: { ok?: boolean; error?: string }) => void) => {
      try {
        const connection = connectedUsers.get(socket.id);
        if (!connection?.examId) return;

        // Process exam submission
        await examSessionManager.submitExam(connection.examId, userId, submissionData);

        // Notify monitoring dashboard
        examMonitoringNamespace.to(`exam_${connection.examId}`).emit('exam-submitted', {
          examId: connection.examId,
          userId,
          timestamp: new Date()
        });

        console.log(`👨‍🎓 Student ${userId} submitted exam ${connection.examId}`);
        if (ack) ack({ ok: true });

      } catch (error) {
        console.error('Error processing exam submission:', error);
        if (ack) ack({ error: 'Failed to submit exam' });
        else socket.emit('error', { message: 'Failed to submit exam' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        const connection = connectedUsers.get(socket.id);
        if (connection) {
          console.log(`👨‍🎓 Student ${connection.userId} disconnected`);

          if (connection.examId) {
            // Notify monitoring dashboard
            examMonitoringNamespace.to(`exam_${connection.examId}`).emit('student-disconnected', {
              examId: connection.examId,
              userId: connection.userId,
              socketId: socket.id,
              timestamp: new Date()
            });

            // Update session status
            await examSessionManager.handleStudentDisconnect(connection.examId, connection.userId);
          }

          // Clean up connection tracking
          connectedUsers.delete(socket.id);
        }
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
    });

    // Heartbeat for connection monitoring
    socket.on('heartbeat', () => {
      const connection = connectedUsers.get(socket.id);
      if (connection) {
        connection.lastActivity = new Date();
      }
    });
  });

  // Start connection cleanup interval
  setInterval(() => {
    cleanupInactiveConnections();
  }, 30000); // Check every 30 seconds

  console.log('🚀 Socket.io server initialized with real-time exam monitoring');
  return io;
}

/**
 * Get Socket.io server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast to exam monitoring dashboard
 */
export function broadcastToExamMonitoring(examId: string, event: string, data: Record<string, unknown>): void {
  if (io) {
    io.of(EXAM_NAMESPACE).to(`exam_${examId}`).emit(event, data);
  }
}

/**
 * Broadcast to student exam room
 */
export function broadcastToStudentExam(examId: string, event: string, data: Record<string, unknown>): void {
  if (io) {
    io.of(STUDENT_NAMESPACE).to(`exam_${examId}`).emit(event, data);
  }
}

/**
 * Get connected users count for an exam
 */
export function getConnectedUsersCount(examId: string): number {
  return Array.from(connectedUsers.values())
    .filter(conn => conn.examId === examId)
    .length;
}

/**
 * Get all connected users
 */
export function getConnectedUsers(): Array<{
  userId: string;
  examId?: string;
  connectedAt: Date;
  lastActivity: Date;
}> {
  return Array.from(connectedUsers.values()).map(({ socketId, ...rest }) => ({
    ...rest,
    socketId // Keep socketId in the returned object for API compatibility
  }));
}

/**
 * Clean up inactive connections
 */
function cleanupInactiveConnections(): void {
  const now = Date.now();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes

  for (const [socketId, connection] of connectedUsers.entries()) {
    if (now - connection.lastActivity.getTime() > timeoutMs) {
      console.log(`🧹 Cleaning up inactive connection for user ${connection.userId}`);

      // Handle cleanup
      if (connection.examId) {
        broadcastToExamMonitoring(connection.examId, 'student-disconnected', {
          examId: connection.examId,
          userId: connection.userId,
          socketId,
          timestamp: new Date(),
          reason: 'timeout'
        });
      }

      connectedUsers.delete(socketId);
    }
  }
}

/**
 * Verify authentication token (implement your auth logic)
 */
// Token verification is handled via verifyAccessToken imported above

/**
 * Graceful shutdown
 */
export async function shutdownSocketServer(): Promise<void> {
  if (io) {
    console.log('🔄 Shutting down Socket.io server...');
    io.close();
    io = null;
  }
}
