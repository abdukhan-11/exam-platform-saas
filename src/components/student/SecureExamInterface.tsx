'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import securityService from '@/lib/security/security-service';

type Question = {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options?: { text: string; isCorrect: boolean }[] | string | null;
};

type Answer = {
  questionId: string;
  answer: string | string[];
  timestamp: number;
};

type Exam = {
  id: string;
  title: string;
  duration: number; // minutes
  totalMarks: number;
  endTime: string;
};

interface SecureExamInterfaceProps {
  examId: string;
}

export default function SecureExamInterface({ examId }: SecureExamInterfaceProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // Exam and question state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer and submission state
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [timeWarning, setTimeWarning] = useState<'none' | '15min' | '5min' | '1min' | 'expired'>('none');

  // Answer management state
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<number>(0);

  const cleanupRef = useRef<() => void>(() => {});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const sessionId = (session as any)?.sessionId || 'unknown';
  const userId = (session as any)?.user?.id || 'unknown';

  // Utility functions
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeWarning = (remainingSeconds: number): 'none' | '15min' | '5min' | '1min' | 'expired' => {
    if (remainingSeconds <= 0) return 'expired';
    if (remainingSeconds <= 60) return '1min';
    if (remainingSeconds <= 300) return '5min';
    if (remainingSeconds <= 900) return '15min';
    return 'none';
  };

  const saveAnswerToLocalStorage = (questionId: string, answer: string) => {
    try {
      const key = `exam_${examId}_answer_${questionId}`;
      const answerData: Answer = {
        questionId,
        answer,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(answerData));
      setLastSaved(Date.now());
    } catch (error) {
      console.error('Failed to save answer to localStorage:', error);
    }
  };

  const loadAnswerFromLocalStorage = (questionId: string): string => {
    try {
      const key = `exam_${examId}_answer_${questionId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const answerData: Answer = JSON.parse(stored);
        return answerData.answer as string;
      }
    } catch (error) {
      console.error('Failed to load answer from localStorage:', error);
    }
    return '';
  };

  const syncAnswersToServer = async (answersMap: Map<string, Answer>) => {
    try {
      const answersArray = Array.from(answersMap.values());
      const response = await fetch(`/api/exams/${examId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersArray,
          sessionId,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync answers');
      }
    } catch (error) {
      console.error('Failed to sync answers to server:', error);
      throw error;
    }
  };

  const validateAnswers = (): { isValid: boolean; missing: number[] } => {
    const missing: number[] = [];
    questions.forEach((question, index) => {
      const answer = answers.get(question.id);
      if (!answer || !answer.answer || (Array.isArray(answer.answer) && answer.answer.length === 0)) {
        missing.push(index + 1);
      }
    });

    return {
      isValid: missing.length === 0,
      missing
    };
  };

  const parsedQuestions = useMemo(() =>
    questions.map((q) => ({
      ...q,
      options: typeof q.options === 'string' ? safeParseOptions(q.options) : q.options,
    })),
  [questions]);

  const current = parsedQuestions[activeIndex];

  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
  }, []);

  // Core security listeners: keyboard shortcuts, back/forward, right click are handled by exam-security and UI guards here
  useEffect(() => {
    let removeListeners = () => {};
    const init = async () => {
      try {
        // Start security monitoring with advanced features
        await securityService.startExamSecurity(examId, userId, sessionId, {
          allowTabSwitch: false,
          requireFullScreen: true,
          enableCopyPaste: false,
          enableRightClick: false,
          enableDevTools: false,
          // Advanced security features
          enableScreenRecordingDetection: true,
          enableNetworkMonitoring: true,
          enableAdvancedClipboardMonitoring: true,
          enableSecureCommunication: true,
          enableAdvancedAntiDebugging: true,
          maxClipboardOperations: 10,
          maxNetworkRequests: 50,
          allowedDomains: ['api.stripe.com', 'fonts.googleapis.com', 'fonts.gstatic.com'], // Example allowed domains
        });

        // Enforce fullscreen on enter
        await requestFullscreen();

        // Block common shortcuts
        const onKeyDown = (e: KeyboardEvent) => {
          const key = e.key.toLowerCase();
          const ctrl = e.ctrlKey || e.metaKey;
          if (
            key === 'f12' || // dev tools
            (ctrl && (key === 'c' || key === 'v' || key === 'x' || key === 'a' || key === 's' || key === 'p')) ||
            (e.altKey && (key === 'tab' || key === 'f4'))
          ) {
            e.preventDefault();
            e.stopPropagation();
          }
        };

        // Block browser back/forward with onbeforeunload and history manipulation
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
          e.preventDefault();
          e.returnValue = '';
        };
        history.pushState(null, '', window.location.href);
        const onPopState = () => history.pushState(null, '', window.location.href);

        // Block context menu at document level as extra guard
        const onContextMenu = (e: MouseEvent) => {
          e.preventDefault();
        };

        document.addEventListener('keydown', onKeyDown, { capture: true });
        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('popstate', onPopState);
        document.addEventListener('contextmenu', onContextMenu);

        removeListeners = () => {
          document.removeEventListener('keydown', onKeyDown, { capture: true } as any);
          window.removeEventListener('beforeunload', onBeforeUnload);
          window.removeEventListener('popstate', onPopState);
          document.removeEventListener('contextmenu', onContextMenu);
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Security initialization failed', err);
      }
    };

    init();
    cleanupRef.current = removeListeners;
    return () => removeListeners();
  }, [examId, userId, sessionId, requestFullscreen]);

  // Load exam data and questions
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load exam details
        const examRes = await fetch(`/api/exams/${examId}`, { cache: 'no-store' });
        if (!examRes.ok) throw new Error('Failed to load exam');
        const examData = await examRes.json();
        setExam(examData);

        // Calculate remaining time
        const endTime = new Date(examData.endTime).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setRemainingTime(remaining);

        // Load questions
        const questionsRes = await fetch(`/api/exams/${examId}/questions`, { cache: 'no-store' });
        if (!questionsRes.ok) throw new Error('Failed to load questions');
        const questionsData = await questionsRes.json();
        setQuestions(questionsData.items || []);

        // Load existing answers from localStorage
        const loadedAnswers = new Map<string, Answer>();
        (questionsData.items || []).forEach((question: Question) => {
          const storedAnswer = loadAnswerFromLocalStorage(question.id);
          if (storedAnswer) {
            loadedAnswers.set(question.id, {
              questionId: question.id,
              answer: storedAnswer,
              timestamp: Date.now()
            });
          }
        });
        setAnswers(loadedAnswers);

      } catch (e: any) {
        setError(e?.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  // Timer effect
  useEffect(() => {
    if (remainingTime <= 0 || !exam) return;

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        const warning = getTimeWarning(newTime);
        setTimeWarning(warning);

        if (newTime <= 0) {
          // Auto-submit when time expires
          handleAutoSubmit();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [remainingTime, exam]);

  // Auto-save effect
  useEffect(() => {
    if (!current || !current.id) return;

    autoSaveRef.current = setTimeout(() => {
      if (currentAnswer.trim()) {
        const answer: Answer = {
          questionId: current.id,
          answer: currentAnswer,
          timestamp: Date.now()
        };

        setAnswers(prev => {
          const newAnswers = new Map(prev);
          newAnswers.set(current.id, answer);
          // Auto-sync to server every 30 seconds
          if (Date.now() - lastSaved > 30000) {
            syncAnswersToServer(newAnswers).catch(console.error);
          }
          return newAnswers;
        });

        saveAnswerToLocalStorage(current.id, currentAnswer);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [currentAnswer, current, lastSaved]);

  // Update current answer when question changes
  useEffect(() => {
    if (current && current.id) {
      const existingAnswer = answers.get(current.id);
      setCurrentAnswer(existingAnswer ? (existingAnswer.answer as string) : '');
    }
  }, [current, answers]);

  const handleAnswerChange = (value: string) => {
    setCurrentAnswer(value);
  };

  const handleAutoSubmit = async () => {
    try {
      setIsSubmitting(true);
      await handleSubmit(true);
    } catch (error) {
      console.error('Auto-submit failed:', error);
      setError('Auto-submit failed. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Sync final answers to server
      await syncAnswersToServer(answers);

      // Submit exam
      const response = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          answers: Array.from(answers.values()),
          submittedAt: new Date().toISOString(),
          isAutoSubmit,
          emergencyReason: isAutoSubmit ? 'Time expired' : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }

      // Clear local storage
      answers.forEach((_, questionId) => {
        localStorage.removeItem(`exam_${examId}_answer_${questionId}`);
      });

      // Navigate to results or completion page
      router.push(`/dashboard/student/exams/${examId}/results`);

    } catch (error) {
      console.error('Submission failed:', error);
      if (!isAutoSubmit) {
        setError('Submission failed. Please try again or contact support.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencySubmit = async () => {
    if (!emergencyReason.trim()) {
      setError('Please provide a reason for emergency submission.');
      return;
    }

    try {
      setIsSubmitting(true);
      await syncAnswersToServer(answers);

      const response = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          answers: Array.from(answers.values()),
          submittedAt: new Date().toISOString(),
          isAutoSubmit: false,
          emergencyReason,
          emergencySubmitted: true
        })
      });

      if (!response.ok) {
        throw new Error('Emergency submission failed');
      }

      // Clear local storage
      answers.forEach((_, questionId) => {
        localStorage.removeItem(`exam_${examId}_answer_${questionId}`);
      });

      router.push(`/dashboard/student/exams/${examId}/results`);
    } catch (error) {
      console.error('Emergency submission failed:', error);
      setError('Emergency submission failed. Please contact support.');
    } finally {
      setIsSubmitting(false);
      setShowEmergencyDialog(false);
      setEmergencyReason('');
    }
  };

  const handleManualSubmit = () => {
    const validation = validateAnswers();
    if (!validation.isValid) {
      setError(`Please answer all questions before submitting. Missing answers for questions: ${validation.missing.join(', ')}`);
      return;
    }
    setShowSubmitDialog(true);
  };

  const next = () => {
    // Save current answer before navigating
    if (current && current.id && currentAnswer.trim()) {
      const answer: Answer = {
        questionId: current.id,
        answer: currentAnswer,
        timestamp: Date.now()
      };
      setAnswers(prev => {
        const newAnswers = new Map(prev);
        newAnswers.set(current.id, answer);
        return newAnswers;
      });
      saveAnswerToLocalStorage(current.id, currentAnswer);
    }
    setActiveIndex((i) => Math.min(parsedQuestions.length - 1, i + 1));
  };

  const prev = () => {
    // Save current answer before navigating
    if (current && current.id && currentAnswer.trim()) {
      const answer: Answer = {
        questionId: current.id,
        answer: currentAnswer,
        timestamp: Date.now()
      };
      setAnswers(prev => {
        const newAnswers = new Map(prev);
        newAnswers.set(current.id, answer);
        return newAnswers;
      });
      saveAnswerToLocalStorage(current.id, currentAnswer);
    }
    setActiveIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div className="space-y-4">
      {/* Header with Timer */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{exam?.title || 'Secure Exam'}</h2>
          <p className="text-sm text-muted-foreground">
            Question {activeIndex + 1} of {parsedQuestions.length}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer Display */}
          <div className="text-right">
            <div className={`text-lg font-mono font-bold ${
              timeWarning === 'expired' ? 'text-red-600' :
              timeWarning === '1min' ? 'text-red-500' :
              timeWarning === '5min' ? 'text-orange-500' :
              timeWarning === '15min' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {formatTime(remainingTime)}
            </div>
            <div className="text-xs text-muted-foreground">Time Remaining</div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmergencyDialog(true)}
              disabled={isSubmitting}
            >
              Emergency
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.exitFullscreen?.()}
            >
              Exit Fullscreen
            </Button>
            <Button
              onClick={handleManualSubmit}
              disabled={isSubmitting || timeWarning === 'expired'}
              size="sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        </div>
      </div>

      {/* Time Warning Alerts */}
      {timeWarning !== 'none' && timeWarning !== 'expired' && (
        <Alert className={
          timeWarning === '1min' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
          timeWarning === '5min' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
        }>
          <AlertDescription>
            {timeWarning === '1min' && '⚠️ Only 1 minute remaining! Please finish your answers.'}
            {timeWarning === '5min' && '⚠️ Only 5 minutes remaining! Save your work frequently.'}
            {timeWarning === '15min' && '⚠️ 15 minutes remaining. Consider reviewing your answers.'}
          </AlertDescription>
        </Alert>
      )}

      {timeWarning === 'expired' && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <AlertDescription>
            ⏰ Time has expired! Your exam is being submitted automatically...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <AlertDescription className="text-red-700 dark:text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-sm text-muted-foreground">Loading exam...</div>
          </CardContent>
        </Card>
      )}

      {/* Question Display */}
      {!loading && !error && current && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Question {activeIndex + 1}</span>
              <div className="text-sm text-muted-foreground">
                {answers.has(current.id) && '✓ Answered'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-base leading-relaxed">{current.text}</p>
            </div>

            {/* Answer Input */}
            {Array.isArray(current.options) && current.options?.length ? (
              <div className="space-y-3">
                {current.options.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${current.id}`}
                      value={(opt as any).text ?? String(opt)}
                      checked={currentAnswer === ((opt as any).text ?? String(opt))}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="flex-1">{(opt as any).text ?? String(opt)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full min-h-32 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your answer here..."
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}

            {/* Progress Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(((activeIndex + 1) / parsedQuestions.length) * 100)}%</span>
              </div>
              <Progress value={((activeIndex + 1) / parsedQuestions.length) * 100} className="h-2" />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={prev}
                disabled={activeIndex === 0}
                className="flex items-center gap-2"
              >
                ← Previous
              </Button>

              <div className="flex gap-2">
                {activeIndex < parsedQuestions.length - 1 ? (
                  <Button onClick={next} className="flex items-center gap-2">
                    Next →
                  </Button>
                ) : (
                  <Button
                    onClick={handleManualSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? 'Submitting...' : 'Finish Exam'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Exam Summary:</h4>
              <div className="text-sm space-y-1">
                <div>Total Questions: {parsedQuestions.length}</div>
                <div>Answered: {answers.size}</div>
                <div>Remaining: {parsedQuestions.length - answers.size}</div>
                <div>Time Remaining: {formatTime(remainingTime)}</div>
              </div>
            </div>

            {(() => {
              const validation = validateAnswers();
              return !validation.isValid && (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                  <AlertDescription>
                    Some questions are unanswered: {validation.missing.join(', ')}
                  </AlertDescription>
                </Alert>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button onClick={() => handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Submission Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency Submission</DialogTitle>
            <DialogDescription>
              Use this option only in case of technical difficulties or emergencies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for Emergency Submission *
              </label>
              <textarea
                className="w-full border rounded-lg p-3 min-h-20"
                placeholder="Please describe the technical issue or emergency situation..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
              />
            </div>

            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
              <AlertDescription>
                Emergency submissions will be reviewed by administrators and may affect your exam results.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEmergencySubmit}
              disabled={isSubmitting || !emergencyReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Submitting...' : 'Emergency Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function safeParseOptions(value: string | null): { text: string; isCorrect: boolean }[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}


