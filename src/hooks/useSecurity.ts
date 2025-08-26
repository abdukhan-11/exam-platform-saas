import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface SecurityAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  factors: {
    device: { risk: string; score: number; details: string[] };
    location: { risk: string; score: number; details: string[] };
    behavior: { risk: string; score: number; details: string[] };
    session: { risk: string; score: number; details: string[] };
  };
  recommendations: string[];
  actions: string[];
  timestamp: number;
}

export interface SecurityStatus {
  sessionTimeout: {
    timeRemaining: number;
    isWarningActive: boolean;
    canExtend: boolean;
    extensionsRemaining: number;
  } | null;
  examSecurity: {
    violations: number;
    tabSwitches: number;
    windowBlurs: number;
    isFullScreen: boolean;
    securityScore: number;
    canContinue: boolean;
  } | null;
  anomalies: {
    isAnomalous: boolean;
    riskScore: number;
    detectedPatterns: any[];
  } | null;
}

export interface UseSecurityOptions {
  examId?: string;
  isExam?: boolean;
  autoAssess?: boolean;
  assessmentInterval?: number; // in milliseconds
}

export function useSecurity(options: UseSecurityOptions = {}) {
  const { data: session } = useSession();
  const [assessment, setAssessment] = useState<SecurityAssessment | null>(null);
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    examId,
    isExam = false,
    autoAssess = true,
    assessmentInterval = 30000, // 30 seconds
  } = options;

  // Perform security assessment
  const assessSecurity = useCallback(async () => {
    if (!session) {
      setError('No active session');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/security/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId,
          isExam,
          action: 'assessment',
        }),
      });

      if (!response.ok) {
        throw new Error(`Security assessment failed: ${response.statusText}`);
      }

      const data = await response.json();
      setAssessment(data.assessment);

    } catch (err) {
      console.error('Security assessment error:', err);
      setError(err instanceof Error ? err.message : 'Assessment failed');
    } finally {
      setLoading(false);
    }
  }, [session, examId, isExam]);

  // Get security status
  const getSecurityStatus = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const response = await fetch('/api/security/assess?sessionId=' + (session.sessionId || ''), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Security status failed: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(data.status);

    } catch (err) {
      console.error('Security status error:', err);
    }
  }, [session]);

  // Extend session
  const extendSession = useCallback(async () => {
    if (!session) {
      setError('No active session');
      return false;
    }

    try {
      const response = await fetch('/api/security/extend-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Session extension failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh security status
        await getSecurityStatus();
        return true;
      } else {
        setError(data.message || 'Extension failed');
        return false;
      }

    } catch (err) {
      console.error('Session extension error:', err);
      setError(err instanceof Error ? err.message : 'Extension failed');
      return false;
    }
  }, [session, getSecurityStatus]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      return false;
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Fullscreen exit failed:', error);
      return false;
    }
  }, []);

  // Check if in fullscreen
  const isFullscreen = useCallback(() => {
    return !!document.fullscreenElement;
  }, []);

  // Set up auto-assessment
  useEffect(() => {
    if (!autoAssess || !session) {
      return;
    }

    // Initial assessment
    assessSecurity();

    // Set up interval
    const interval = setInterval(() => {
      assessSecurity();
      getSecurityStatus();
    }, assessmentInterval);

    return () => clearInterval(interval);
  }, [autoAssess, session, assessSecurity, getSecurityStatus, assessmentInterval]);

  // Set up activity tracking
  useEffect(() => {
    if (!session) {
      return;
    }

    const trackActivity = () => {
      // Record activity via API
      fetch('/api/security/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId,
          isExam,
          action: 'activity',
        }),
      }).catch(console.error);
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity);
      });
    };
  }, [session, examId, isExam]);

  // Set up visibility change tracking
  useEffect(() => {
    if (!session || !isExam) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Record tab switch
        fetch('/api/security/assess', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            examId,
            isExam,
            action: 'tab_switch',
          }),
        }).catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, isExam, examId]);

  // Set up fullscreen change tracking
  useEffect(() => {
    if (!session || !isExam) {
      return;
    }

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      
      fetch('/api/security/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId,
          isExam,
          action: isFullscreen ? 'fullscreen_enter' : 'fullscreen_exit',
        }),
      }).catch(console.error);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [session, isExam, examId]);

  // Set up copy/paste prevention for exams
  useEffect(() => {
    if (!isExam) {
      return;
    }

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      
      // Record violation
      fetch('/api/security/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId,
          isExam,
          action: 'copy_paste_blocked',
        }),
      }).catch(console.error);
    };

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      
      // Record violation
      fetch('/api/security/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId,
          isExam,
          action: 'right_click_blocked',
        }),
      }).catch(console.error);
    };

    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('contextmenu', preventRightClick);

    return () => {
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('contextmenu', preventRightClick);
    };
  }, [isExam, examId]);

  return {
    assessment,
    status,
    loading,
    error,
    assessSecurity,
    getSecurityStatus,
    extendSession,
    requestFullscreen,
    exitFullscreen,
    isFullscreen,
  };
}
