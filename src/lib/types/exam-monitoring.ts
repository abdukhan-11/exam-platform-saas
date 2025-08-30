// Shared types for exam monitoring system

export interface ExamMonitoringData {
  examId: string;
  userId: string;
  action: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface CheatingAlert {
  examId: string;
  userId: string;
  alertType: 'tab_switch' | 'copy_paste' | 'window_focus' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface ActivityEvent {
  action: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface ExamSessionData {
  examId: string;
  studentId: string;
  startTime: Date;
  heartbeatInterval: number;
}

export interface MonitoringEvent {
  type: 'exam_status' | 'student_joined' | 'student_left' | 'alert' | 'exam_completed';
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface StudentData {
  userId: string;
  name: string;
  rollNo?: string;
  session: {
    connectedAt: string;
    lastActivity: string;
    status: string;
  };
  progress?: {
    score: number;
    totalMarks?: number;
    isCompleted: boolean;
    timeSpent: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    latest: CheatingAlert[];
  };
}

export interface DashboardData {
  exam: {
    id: string;
    title: string;
    subject: string;
    startTime: string;
    endTime: string;
    duration: number;
    totalMarks: number;
    totalQuestions: number;
    status: 'upcoming' | 'active' | 'completed';
  };
  realTime: {
    connectedStudents: number;
    activeStudents: number;
    completedStudents: number;
    disconnectedStudents: number;
    averageProgress: number;
    alertsCount: number;
  };
  summary: {
    totalEnrolled: number;
    completionRate: number;
    averageScore: number;
    timeRemaining: number;
  };
  alerts: {
    total: number;
    recent: number;
    bySeverity: Record<string, number>;
    latest: CheatingAlert[];
  };
}

export interface ExamData {
  id: string;
  title: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalMarks: number;
  totalQuestions: number;
  attempts: Array<{
    userId: string;
    score: number | null;
    isCompleted: boolean;
    endedAt: Date | null;
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

export type MonitoringCallback = (event: MonitoringEvent) => void;
