'use client';

/**
 * Secure Exam Interface with AI-Powered Behavior Analysis
 *
 * This component demonstrates the integration of AI-powered behavior analysis
 * with the secure exam interface, providing real-time anomaly detection and
 * cheating prevention through mouse tracking, keystroke analysis, and gaze monitoring.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { examSecurityService } from '@/lib/security/exam-security';
import { behaviorAnalysisEngine, BehaviorAnalysisResult } from '@/lib/security/behavior-analysis';

interface SecureExamInterfaceProps {
  examId: string;
  userId: string;
  sessionId: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
  }>;
  onSubmit: (answers: Record<string, string>) => void;
  onTerminate: (reason: string) => void;
}

interface BehaviorAnalysisDisplay {
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedPatterns: string[];
  recommendations: string[];
  attentionScore: number;
  behaviorScore: number;
}

export default function SecureExamInterfaceWithBehaviorAnalysis({
  examId,
  userId,
  sessionId,
  questions,
  onSubmit,
  onTerminate
}: SecureExamInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<BehaviorAnalysisDisplay>({
    anomalyScore: 0,
    riskLevel: 'low',
    detectedPatterns: [],
    recommendations: [],
    attentionScore: 100,
    behaviorScore: 100
  });
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const questionStartTime = useRef<number>(Date.now());
  const keystrokeCount = useRef<number>(0);
  const hesitationCount = useRef<number>(0);
  const revisionCount = useRef<number>(0);
  const analysisInterval = useRef<NodeJS.Timeout | null>(null);
  const gazeTrackingInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize exam security with behavior analysis
  useEffect(() => {
    const config = {
      examId,
      userId,
      sessionId,
      startTime: Date.now(),
      endTime: Date.now() + 3600000, // 1 hour
      duration: 60, // 60 minutes
      allowTabSwitch: false,
      requireFullScreen: true,
      enableBrowserLock: true,
      enableCopyPaste: false,
      enableRightClick: false,
      enableDevTools: false,
      maxTabSwitches: 3,
      maxWindowBlurs: 5,
      screenshotInterval: 30,
      heartbeatInterval: 30,
      // Advanced security features
      enableScreenRecordingDetection: true,
      enableNetworkMonitoring: true,
      enableAdvancedClipboardMonitoring: true,
      enableSecureCommunication: true,
      enableAdvancedAntiDebugging: true,
      maxClipboardOperations: 10,
      maxNetworkRequests: 50,
      allowedDomains: [window.location.origin],
      // AI-Powered Behavior Analysis
      enableBehaviorAnalysis: true,
      enableMouseTracking: true,
      enableKeystrokeAnalysis: true,
      enableGazeTracking: true,
      enableTimeBasedAnalysis: true,
      behaviorAnalysisInterval: 10, // Analyze every 10 seconds
      anomalyThreshold: 60, // Trigger warnings at 60+ anomaly score
      enablePatternRecognition: true,
      maxCoordinatedAttempts: 3
    };

    // Start exam security monitoring
    examSecurityService.startExamSecurity(config);

    // Request fullscreen
    examSecurityService.requestFullscreen().then(success => {
      setIsFullscreen(success);
    });

    // Start behavior analysis monitoring
    analysisInterval.current = setInterval(async () => {
      const analysisResult = await behaviorAnalysisEngine.analyzeBehavior(sessionId);
      const status = examSecurityService.getSecurityStatus(examId, userId, sessionId);

      setSecurityStatus(status);
      setBehaviorAnalysis({
        anomalyScore: analysisResult.anomalyScore,
        riskLevel: analysisResult.riskLevel,
        detectedPatterns: analysisResult.detectedPatterns,
        recommendations: analysisResult.recommendations,
        attentionScore: status?.attentionScore || 100,
        behaviorScore: status?.behaviorScore || 100
      });

      // Check for critical anomalies
      if (analysisResult.riskLevel === 'critical' || analysisResult.anomalyScore > 80) {
        setWarningMessage('Critical security anomaly detected. Exam may be terminated.');
        setShowSecurityWarning(true);
      } else if (analysisResult.riskLevel === 'high' || analysisResult.anomalyScore > 60) {
        setWarningMessage('Security anomaly detected. Please maintain proper exam conduct.');
        setShowSecurityWarning(true);
      } else {
        setShowSecurityWarning(false);
      }

      // Auto-terminate for severe violations
      if (status && !status.canContinue) {
        onTerminate('Security violations exceeded threshold');
      }
    }, 10000); // Update every 10 seconds

    return () => {
      // Cleanup
      examSecurityService.stopExamSecurity(examId, userId, sessionId);
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
      if (gazeTrackingInterval.current) {
        clearInterval(gazeTrackingInterval.current);
      }
    };
  }, [examId, userId, sessionId, onTerminate]);

  // Mouse movement tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      behaviorAnalysisEngine.recordMouseMovement(sessionId, e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [sessionId]);

  // Keystroke tracking
  useEffect(() => {
    let keyDownTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      keyDownTime = Date.now();
      keystrokeCount.current++;

      // Detect hesitations (long pauses between keystrokes)
      if (e.key !== 'Backspace' && keystrokeCount.current > 1) {
        hesitationCount.current++;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keyDownTime > 0) {
        const duration = Date.now() - keyDownTime;
        behaviorAnalysisEngine.recordKeystroke(sessionId, e.key, duration);

        // Track revisions (backspace usage)
        if (e.key === 'Backspace') {
          revisionCount.current++;
        }

        keyDownTime = 0;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [sessionId]);

  // Gaze tracking simulation
  useEffect(() => {
    gazeTrackingInterval.current = setInterval(() => {
      // Simulate gaze tracking (in real implementation, this would use webcam)
      const gazeX = Math.random() * window.innerWidth;
      const gazeY = Math.random() * window.innerHeight;
      const confidence = 0.7 + Math.random() * 0.3;
      const pupilDilation = 0.3 + Math.random() * 0.4;
      const blinkRate = 15 + Math.random() * 10;

      behaviorAnalysisEngine.recordGazeData(sessionId, gazeX, gazeY, confidence, pupilDilation, blinkRate);
    }, 200); // Update every 200ms

    return () => {
      if (gazeTrackingInterval.current) {
        clearInterval(gazeTrackingInterval.current);
      }
    };
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onTerminate('Time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTerminate]);

  const handleAnswerSelect = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    // Record time pattern for this question
    const endTime = Date.now();
    const timeSpent = endTime - questionStartTime.current;

    examSecurityService.recordQuestionTimePattern(
      examId,
      userId,
      sessionId,
      questionId,
      questionStartTime.current,
      endTime,
      answer.length,
      hesitationCount.current,
      revisionCount.current
    );

    // Reset counters for next question
    keystrokeCount.current = 0;
    hesitationCount.current = 0;
    revisionCount.current = 0;
    questionStartTime.current = Date.now();
  }, [examId, userId, sessionId]);

  const handleNextQuestion = useCallback(() => {
    // Record time pattern before moving to next question
    const currentQuestion = questions[currentQuestionIndex];
    if (answers[currentQuestion.id]) {
      const endTime = Date.now();
      examSecurityService.recordQuestionTimePattern(
        examId,
        userId,
        sessionId,
        currentQuestion.id,
        questionStartTime.current,
        endTime,
        answers[currentQuestion.id].length,
        hesitationCount.current,
        revisionCount.current
      );
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      questionStartTime.current = Date.now();
      keystrokeCount.current = 0;
      hesitationCount.current = 0;
      revisionCount.current = 0;
    }
  }, [currentQuestionIndex, questions, answers, examId, userId, sessionId]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      questionStartTime.current = Date.now();
      keystrokeCount.current = 0;
      hesitationCount.current = 0;
      revisionCount.current = 0;
    }
  }, [currentQuestionIndex]);

  const handleSubmit = useCallback(() => {
    // Record final question time pattern
    const currentQuestion = questions[currentQuestionIndex];
    if (answers[currentQuestion.id]) {
      const endTime = Date.now();
      examSecurityService.recordQuestionTimePattern(
        examId,
        userId,
        sessionId,
        currentQuestion.id,
        questionStartTime.current,
        endTime,
        answers[currentQuestion.id].length,
        hesitationCount.current,
        revisionCount.current
      );
    }

    onSubmit(answers);
  }, [answers, currentQuestionIndex, questions, examId, userId, sessionId, onSubmit]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (riskLevel: string): "destructive" | "secondary" | "default" | "warning" | "success" | "outline" | "info" => {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Security Warning */}
      {showSecurityWarning && (
        <Alert className="m-4 border-red-500 bg-red-50">
          <AlertDescription className="text-red-800">
            {warningMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Security Status */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Secure Exam</h1>
            <Badge variant={isFullscreen ? 'default' : 'destructive'}>
              {isFullscreen ? 'Fullscreen Active' : 'Exit Fullscreen Warning'}
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            {/* Behavior Analysis Status */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Risk Level:</span>
              <Badge variant={getRiskColor(behaviorAnalysis.riskLevel)}>
                {behaviorAnalysis.riskLevel.toUpperCase()}
              </Badge>
            </div>

            {/* Timer */}
            <div className="text-lg font-mono font-semibold">
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardTitle>
                <div className="text-sm text-gray-500">
                  Progress: {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </div>
              </div>
              <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-lg">{currentQuestion.question}</div>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                      className="text-blue-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                >
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    Submit Exam
                  </Button>
                ) : (
                  <Button onClick={handleNextQuestion}>
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Monitoring Sidebar */}
        <div className="w-80 bg-white border-l p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Security Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Security Score:</span>
                <span className="font-semibold">{securityStatus?.securityScore || 100}/100</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm">Violations:</span>
                <span className="font-semibold text-red-600">{securityStatus?.violations || 0}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm">Tab Switches:</span>
                <span className="font-semibold">{securityStatus?.tabSwitches || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Behavior Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Anomaly Score:</span>
                <span className="font-semibold">{behaviorAnalysis.anomalyScore}/100</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm">Attention Score:</span>
                <span className="font-semibold">{behaviorAnalysis.attentionScore}/100</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm">Behavior Score:</span>
                <span className="font-semibold">{behaviorAnalysis.behaviorScore}/100</span>
              </div>

              {behaviorAnalysis.detectedPatterns.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Detected Patterns:</div>
                  <div className="space-y-1">
                    {behaviorAnalysis.detectedPatterns.slice(0, 3).map((pattern, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {pattern.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {behaviorAnalysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-orange-600">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1">
                  {behaviorAnalysis.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index} className="text-gray-600">• {rec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
