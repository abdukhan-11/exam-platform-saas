import { io, Socket } from 'socket.io-client';
import {
  ActivityEvent,
  ExamSessionData,
  MonitoringEvent,
  MonitoringCallback
} from './types/exam-monitoring';

const sockets: Record<string, Socket> = {};
let currentExamId: string | null = null;
let activityBuffer: ActivityEvent[] = [];
let heartbeatInterval: NodeJS.Timeout | null = null;

// Re-export types for convenience
export type {
  ActivityEvent,
  ExamSessionData,
  MonitoringEvent,
  MonitoringCallback
} from './types/exam-monitoring';

/**
 * Get or create Socket.io connection
 */
export function getSocket(namespace: '/exam-monitoring' | '/student-exam' | '/' = '/'): Socket {
  const ns = namespace || '/';
  if (!sockets[ns]) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = ns === '/' ? baseUrl : `${baseUrl}${ns}`;
    const auth = getClientAuth();
    sockets[ns] = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth,
      query: auth?.token ? { token: auth.token } : {}
    });

    // Set up global event handlers per socket instance
    setupSocketEventHandlers(sockets[ns]);
  }
  return sockets[ns];
}

/**
 * Disconnect socket and cleanup
 */
export function disconnectSocket(namespace?: '/exam-monitoring' | '/student-exam' | '/'): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (namespace) {
    const sock = sockets[namespace];
    if (sock) {
      sock.disconnect();
      delete sockets[namespace];
    }
  } else {
    for (const key of Object.keys(sockets)) {
      sockets[key].disconnect();
      delete sockets[key];
    }
  }

  currentExamId = null;
  activityBuffer = [];
}

/**
 * Join an exam session for monitoring
 */
export function joinExamSession(examId: string, studentId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = getSocket('/student-exam');

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join-exam', examId, (response: any) => {
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }

      currentExamId = examId;

      // Start heartbeat
      startHeartbeat();

      // Start activity monitoring
      startActivityMonitoring();

      console.log(`✅ Joined exam session: ${examId}`);
      resolve();
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Join exam timeout'));
    }, 10000);
  });
}

/**
 * Leave current exam session
 */
export function leaveExamSession(): void {
  const socket = sockets['/student-exam'];
  if (currentExamId && socket) {
    socket.emit('leave-exam', currentExamId);
    currentExamId = null;
  }

  stopHeartbeat();
  stopActivityMonitoring();
}

/**
 * Send activity update to server
 */
export function sendActivityUpdate(action: string, data: any): void {
  const socket = sockets['/student-exam'];
  if (!socket || !currentExamId) {
    console.warn('No active exam session');
    return;
  }

  const activityEvent: ActivityEvent = {
    action,
    data,
    timestamp: new Date()
  };

  // Add to buffer for batch processing
  activityBuffer.push(activityEvent);

  // Send immediately for critical events
  if (isCriticalActivity(action)) {
    flushActivityBuffer();
  }

  // Auto-flush buffer every 5 seconds or when it reaches 10 items
  if (activityBuffer.length >= 10) {
    flushActivityBuffer();
  }
}

/**
 * Flush activity buffer to server
 */
export function flushActivityBuffer(): void {
  const socket = sockets['/student-exam'];
  if (activityBuffer.length === 0 || !socket) return;

  const activities = [...activityBuffer];
  activityBuffer = [];

  socket.emit('activity-update', {
    examId: currentExamId,
    activities,
    timestamp: new Date()
  });
}

/**
 * Submit exam
 */
export function submitExam(submissionData: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = sockets['/student-exam'];
    if (!socket || !currentExamId) {
      reject(new Error('No active exam session'));
      return;
    }

    // Flush any pending activities
    flushActivityBuffer();

    socket.emit('submit-exam', submissionData, (response: any) => {
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }

      console.log('✅ Exam submitted successfully');
      leaveExamSession();
      resolve();
    });
  });
}

/**
 * Subscribe to exam monitoring (for teachers/admins)
 */
export function subscribeToExamMonitoring(examId: string, callback: MonitoringCallback): void {
  const socket = getSocket('/exam-monitoring');

  socket.emit('subscribe-exam', examId);

  // Set up monitoring event listeners
  socket.on('exam-status', (data) => {
    callback({
      type: 'exam_status',
      data,
      timestamp: new Date()
    });
  });

  socket.on('student-joined', (data) => {
    callback({
      type: 'student_joined',
      data,
      timestamp: new Date()
    });
  });

  socket.on('student-disconnected', (data) => {
    callback({
      type: 'student_left',
      data,
      timestamp: new Date()
    });
  });

  socket.on('exam-submitted', (data) => {
    callback({
      type: 'exam_completed',
      data,
      timestamp: new Date()
    });
  });

  socket.on('cheating-alert', (data) => {
    callback({
      type: 'alert',
      data,
      timestamp: new Date()
    });
  });
}

/**
 * Unsubscribe from exam monitoring
 */
export function unsubscribeFromExamMonitoring(examId?: string): void {
  const socket = sockets['/exam-monitoring'];
  if (socket) {
    socket.off('exam-status');
    socket.off('student-joined');
    socket.off('student-disconnected');
    socket.off('exam-submitted');
    socket.off('cheating-alert');
  }
}

/**
 * Get current exam session info
 */
export function getCurrentExamSession(): ExamSessionData | null {
  if (!currentExamId) return null;

  return {
    examId: currentExamId,
    studentId: '', // Would be set from auth context
    startTime: new Date(), // Would be set when joining
    heartbeatInterval: 30000
  };
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return Boolean(sockets['/student-exam']?.connected || sockets['/exam-monitoring']?.connected);
}

/**
 * Get connection status
 */
export function getConnectionStatus(): {
  connected: boolean;
  currentExamId: string | null;
  bufferedActivities: number;
} {
  return {
    connected: isConnected(),
    currentExamId,
    bufferedActivities: activityBuffer.length
  };
}

// Private helper functions

function setupSocketEventHandlers(socket: Socket): void {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);

    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔌 Socket reconnected after ${attemptNumber} attempts`);

    // Rejoin exam session if we were in one
    if (currentExamId) {
      joinExamSession(currentExamId, '').catch(console.error);
    }
  });
}

function startHeartbeat(): void {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    const socket = sockets['/student-exam'];
    if (socket?.connected) {
      socket.emit('heartbeat');
    }
  }, 30000); // Send heartbeat every 30 seconds
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function startActivityMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Monitor visibility changes (tab switching)
  document.addEventListener('visibilitychange', () => {
    sendActivityUpdate('visibility_change', {
      hidden: document.hidden,
      reason: document.hidden ? 'tab_switch' : 'tab_focus',
      timestamp: new Date()
    });
  });

  // Monitor window focus/blur
  window.addEventListener('focus', () => {
    sendActivityUpdate('window_focus', { focused: true });
  });

  window.addEventListener('blur', () => {
    sendActivityUpdate('window_focus', { focused: false });
  });

  // Monitor mouse movements (sampled)
  let lastMouseMove = 0;
  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMouseMove > 1000) { // Sample every second
      sendActivityUpdate('mouse_movement', {
        x: e.clientX,
        y: e.clientY,
        timestamp: now
      });
      lastMouseMove = now;
    }
  });

  // Monitor keyboard activity
  document.addEventListener('keydown', (e) => {
    // Don't track password fields or sensitive inputs
    if (e.target instanceof HTMLInputElement &&
        (e.target.type === 'password' || e.target.type === 'email')) {
      return;
    }

    sendActivityUpdate('keyboard_activity', {
      key: e.key,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      timestamp: Date.now()
    });
  });

  // Monitor copy/paste attempts
  document.addEventListener('copy', (e) => {
    sendActivityUpdate('clipboard_event', {
      type: 'copy',
      timestamp: Date.now()
    });
  });

  document.addEventListener('paste', (e) => {
    sendActivityUpdate('clipboard_event', {
      type: 'paste',
      timestamp: Date.now()
    });
  });

  document.addEventListener('cut', (e) => {
    sendActivityUpdate('clipboard_event', {
      type: 'cut',
      timestamp: Date.now()
    });
  });

  // Monitor right-click context menu
  document.addEventListener('contextmenu', (e) => {
    sendActivityUpdate('context_menu', {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    });
  });

  // Monitor window resize (potential multi-monitor setup)
  window.addEventListener('resize', () => {
    sendActivityUpdate('window_resize', {
      width: window.innerWidth,
      height: window.innerHeight,
      timestamp: Date.now()
    });
  });

  // Set up periodic activity flush
  setInterval(() => {
    flushActivityBuffer();
  }, 5000); // Flush every 5 seconds
}

function stopActivityMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Remove all event listeners
  document.removeEventListener('visibilitychange', () => {});
  window.removeEventListener('focus', () => {});
  window.removeEventListener('blur', () => {});
  document.removeEventListener('mousemove', () => {});
  document.removeEventListener('keydown', () => {});
  document.removeEventListener('copy', () => {});
  document.removeEventListener('paste', () => {});
  document.removeEventListener('cut', () => {});
  document.removeEventListener('contextmenu', () => {});
  window.removeEventListener('resize', () => {});
}

function isCriticalActivity(action: string): boolean {
  const criticalActions = [
    'visibility_change',
    'window_focus',
    'clipboard_event',
    'context_menu',
    'dev_tools_opened'
  ];

  return criticalActions.includes(action);
}

// Auto-flush activities on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushActivityBuffer();
  });
}
// Get client auth token if available for socket auth
function getClientAuth(): { token?: string } | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    const token = (window as any).localStorage?.getItem('accessToken') || undefined;
    return token ? { token } : undefined;
  } catch {
    return undefined;
  }
}

