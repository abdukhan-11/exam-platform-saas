'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import SecureExamInterfaceWithBehaviorAnalysis from '@/components/student/SecureExamInterfaceWithBehaviorAnalysis';

interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startTime: string;
  endTime: string;
  subject: {
    id: string;
    name: string;
  };
  questions: Array<{
    id: string;
    text: string;
    type: string;
    options: Array<{
      id: string;
      text: string;
    }>;
  }>;
}

interface ExamAttempt {
  id: string;
  startedAt: string;
  isCompleted: boolean;
}

export default function StudentExamTakingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const loadExamData = async () => {
      try {
        if (!resolvedParams?.id) return;
        
        setLoading(true);
        
        // Get exam details and questions
        const examResponse = await fetch(`/api/exams/${resolvedParams.id}/questions`, { cache: 'no-store' });
        if (!examResponse.ok) {
          throw new Error('Failed to load exam');
        }
        
        const examData = await examResponse.json();
        setExam(examData);

        // Check if student has already attempted this exam
        const attemptResponse = await fetch(`/api/exams/${resolvedParams.id}/attempt`, { cache: 'no-store' });
        if (attemptResponse.ok) {
          const attemptData = await attemptResponse.json();
          setAttempt(attemptData);
          
          if (attemptData.isCompleted) {
            setError('You have already completed this exam.');
            return;
          }
        }

        // Check if exam is currently available
        const now = new Date();
        const startTime = new Date(examData.startTime);
        const endTime = new Date(examData.endTime);

        if (now < startTime) {
          setError('This exam has not started yet.');
          return;
        }

        if (now > endTime) {
          setError('This exam has ended.');
          return;
        }

        // Calculate time remaining
        const remainingMs = endTime.getTime() - now.getTime();
        setTimeRemaining(Math.floor(remainingMs / 1000));

      } catch (err: any) {
        setError(err.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [resolvedParams?.id]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setError('Time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleStartExam = async () => {
    try {
      if (!resolvedParams?.id) {
        throw new Error('Exam ID not available');
      }
      
      // Create exam attempt
      const response = await fetch(`/api/exams/${resolvedParams.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start exam');
      }

      const attemptData = await response.json();
      setAttempt(attemptData);
      setExamStarted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start exam');
    }
  };

  const handleSubmitExam = async (answers: Record<string, string>) => {
    try {
      if (!resolvedParams?.id) {
        throw new Error('Exam ID not available');
      }
      
      const response = await fetch(`/api/exams/${resolvedParams.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            answers: Object.entries(answers).map(([questionId, answer]) => ({
              questionId,
              answer,
              timestamp: Date.now()
            }))
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }

      const result = await response.json();
      
      // Redirect to results page
      router.push(`/dashboard/student/exams/${resolvedParams.id}/results`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam');
    }
  };

  const handleTerminateExam = (reason: string) => {
    setError(`Exam terminated: ${reason}`);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !resolvedParams?.id) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/student/exams')}>
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Exam not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If exam has started, show the secure exam interface
  if (examStarted && attempt) {
    return (
      <SecureExamInterfaceWithBehaviorAnalysis
        examId={exam.id}
        userId="current-user" // This should come from session
        sessionId={attempt.id}
        questions={exam.questions.map(q => ({
          id: q.id,
          question: q.text,
          options: q.options.map(opt => opt.text)
        }))}
        onSubmit={handleSubmitExam}
        onTerminate={handleTerminateExam}
      />
    );
  }

  // Pre-exam information and start button
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Exam Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{exam.title}</CardTitle>
                <p className="text-muted-foreground mt-2">{exam.description}</p>
              </div>
              <Badge variant="outline" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {exam.subject.name}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Exam Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold">{exam.duration} minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Total Marks</span>
              </div>
              <p className="text-2xl font-bold">{exam.totalMarks}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Passing Marks</span>
              </div>
              <p className="text-2xl font-bold">{exam.passingMarks}</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Remaining */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
                {formatTime(timeRemaining)}
              </div>
              <Progress 
                value={(timeRemaining / (exam.duration * 60)) * 100} 
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exam Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <ul className="list-disc list-inside space-y-2">
                <li>This exam consists of {exam.questions.length} questions</li>
                <li>You have {exam.duration} minutes to complete the exam</li>
                <li>Each question has multiple choice answers</li>
                <li>You can navigate between questions using Previous/Next buttons</li>
                <li>Make sure to submit your exam before time expires</li>
                <li>Once submitted, you cannot change your answers</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Do not switch tabs or minimize the browser window</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            <strong>Security Notice:</strong> This exam is monitored for security purposes. 
            Any suspicious activity may result in exam termination. Please maintain proper exam conduct.
          </AlertDescription>
        </Alert>

        {/* Start Exam Button */}
        <div className="text-center">
          <Button 
            onClick={handleStartExam}
            size="lg"
            className="bg-green-600 hover:bg-green-700 px-8 py-3"
          >
            Start Exam
          </Button>
        </div>
      </div>
    </div>
  );
}