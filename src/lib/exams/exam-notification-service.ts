import { getSocket } from '@/lib/realtime';

export interface ExamStatusUpdate {
  examId: string;
  status: 'draft' | 'published' | 'scheduled' | 'in_progress' | 'completed';
  action: 'PUBLISH' | 'ACTIVATE' | 'DEACTIVATE' | 'UNPUBLISH';
  timestamp: string;
  details?: any;
}

export interface ExamNotification {
  type: 'status_change' | 'student_joined' | 'student_submitted' | 'cheating_alert';
  examId: string;
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

/**
 * Service for sending real-time notifications about exam lifecycle events
 */
export class ExamNotificationService {
  private static instance: ExamNotificationService;

  private constructor() {}

  public static getInstance(): ExamNotificationService {
    if (!ExamNotificationService.instance) {
      ExamNotificationService.instance = new ExamNotificationService();
    }
    return ExamNotificationService.instance;
  }

  /**
   * Send exam status update to all connected teachers/admins
   */
  async sendExamStatusUpdate(update: ExamStatusUpdate): Promise<void> {
    try {
      const socket = getSocket('/exam-monitoring');
      
      if (socket.connected) {
        socket.emit('exam-status-update', update);
        console.log(`📡 Sent exam status update: ${update.action} for exam ${update.examId}`);
      } else {
        console.warn('Socket not connected, cannot send exam status update');
      }
    } catch (error) {
      console.error('Error sending exam status update:', error);
    }
  }

  /**
   * Send notification to specific exam room
   */
  async sendExamNotification(notification: ExamNotification): Promise<void> {
    try {
      const socket = getSocket('/exam-monitoring');
      
      if (socket.connected) {
        socket.emit('exam-notification', notification);
        console.log(`📡 Sent exam notification: ${notification.type} for exam ${notification.examId}`);
      } else {
        console.warn('Socket not connected, cannot send exam notification');
      }
    } catch (error) {
      console.error('Error sending exam notification:', error);
    }
  }

  /**
   * Notify about exam publishing
   */
  async notifyExamPublished(examId: string, examTitle: string, publishedBy: string): Promise<void> {
    const update: ExamStatusUpdate = {
      examId,
      status: 'published',
      action: 'PUBLISH',
      timestamp: new Date().toISOString(),
      details: {
        publishedBy,
        examTitle
      }
    };

    const notification: ExamNotification = {
      type: 'status_change',
      examId,
      title: examTitle,
      message: `Exam "${examTitle}" has been published`,
      timestamp: new Date().toISOString(),
      data: {
        action: 'PUBLISH',
        publishedBy
      }
    };

    await Promise.all([
      this.sendExamStatusUpdate(update),
      this.sendExamNotification(notification)
    ]);
  }

  /**
   * Notify about exam activation
   */
  async notifyExamActivated(examId: string, examTitle: string, activatedBy: string): Promise<void> {
    const update: ExamStatusUpdate = {
      examId,
      status: 'in_progress',
      action: 'ACTIVATE',
      timestamp: new Date().toISOString(),
      details: {
        activatedBy,
        examTitle
      }
    };

    const notification: ExamNotification = {
      type: 'status_change',
      examId,
      title: examTitle,
      message: `Exam "${examTitle}" is now active`,
      timestamp: new Date().toISOString(),
      data: {
        action: 'ACTIVATE',
        activatedBy
      }
    };

    await Promise.all([
      this.sendExamStatusUpdate(update),
      this.sendExamNotification(notification)
    ]);
  }

  /**
   * Notify about exam deactivation
   */
  async notifyExamDeactivated(examId: string, examTitle: string, deactivatedBy: string): Promise<void> {
    const update: ExamStatusUpdate = {
      examId,
      status: 'published',
      action: 'DEACTIVATE',
      timestamp: new Date().toISOString(),
      details: {
        deactivatedBy,
        examTitle
      }
    };

    const notification: ExamNotification = {
      type: 'status_change',
      examId,
      title: examTitle,
      message: `Exam "${examTitle}" has been deactivated`,
      timestamp: new Date().toISOString(),
      data: {
        action: 'DEACTIVATE',
        deactivatedBy
      }
    };

    await Promise.all([
      this.sendExamStatusUpdate(update),
      this.sendExamNotification(notification)
    ]);
  }

  /**
   * Notify about exam unpublishing
   */
  async notifyExamUnpublished(examId: string, examTitle: string, unpublishedBy: string): Promise<void> {
    const update: ExamStatusUpdate = {
      examId,
      status: 'draft',
      action: 'UNPUBLISH',
      timestamp: new Date().toISOString(),
      details: {
        unpublishedBy,
        examTitle
      }
    };

    const notification: ExamNotification = {
      type: 'status_change',
      examId,
      title: examTitle,
      message: `Exam "${examTitle}" has been unpublished`,
      timestamp: new Date().toISOString(),
      data: {
        action: 'UNPUBLISH',
        unpublishedBy
      }
    };

    await Promise.all([
      this.sendExamStatusUpdate(update),
      this.sendExamNotification(notification)
    ]);
  }

  /**
   * Send custom exam notification
   */
  async sendCustomNotification(
    examId: string, 
    examTitle: string, 
    message: string, 
    type: ExamNotification['type'] = 'status_change',
    data?: any
  ): Promise<void> {
    const notification: ExamNotification = {
      type,
      examId,
      title: examTitle,
      message,
      timestamp: new Date().toISOString(),
      data
    };

    await this.sendExamNotification(notification);
  }
}
