'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, BookOpen, Target, Calendar, User } from 'lucide-react';

interface ExamDetails {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  totalMarks: number;
  subject: {
    id: string;
    name: string;
    code?: string;
  };
  class?: {
    id: string;
    name: string;
  };
  instructions?: string[];
  questionCount?: number;
}

export default function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExamDetails = async () => {
      try {
        setLoading(true);
        const examId = resolvedParams.id as string;
        
        // Check for superadmin override
        const url = new URL(window.location.href);
        const asParam = url.searchParams.get('as');
        const collegeIdParam = url.searchParams.get('collegeId');
        const useOverride = asParam === 'superadmin' && !!collegeIdParam;
        
        const examUrl = new URL(`/api/exams/${examId}`, window.location.origin);
        if (useOverride && collegeIdParam) {
          examUrl.searchParams.set('collegeId', collegeIdParam);
        }

        const response = await fetch(examUrl.toString(), { cache: 'no-store' });
        
        if (response.ok) {
          const data = await response.json();
          setExam(data);
        } else if (response.status === 404) {
          setError('Exam not found');
        } else {
          setError('Failed to load exam details');
        }
      } catch (err) {
        console.error('Error loading exam details:', err);
        setError('An error occurred while loading exam details');
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      loadExamDetails();
    }
  }, [resolvedParams.id]);

  const getExamStatus = () => {
    if (!exam) return 'loading';
    
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'in-progress';
    return 'completed';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading exam details...</span>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'Exam not found'}</p>
          <Button asChild>
            <Link href="/dashboard/student">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = getExamStatus();
  const canStart = status === 'in-progress';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/student">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{exam.title}</h1>
          <p className="text-muted-foreground">Exam Details</p>
        </div>
        <Badge 
          variant={status === 'in-progress' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'}
          className="text-sm"
        >
          {status.replace('-', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Exam Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exam.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{exam.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Start Time</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(exam.startTime)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(exam.duration)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Marks</p>
                    <p className="text-sm text-muted-foreground">{exam.totalMarks}</p>
                  </div>
                </div>
                
                {exam.questionCount && (
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Questions</p>
                      <p className="text-sm text-muted-foreground">{exam.questionCount}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          {exam.instructions && exam.instructions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Exam Instructions</CardTitle>
                <CardDescription>Please read these instructions carefully before starting the exam</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {exam.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">{index + 1}.</span>
                      <span className="text-sm">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subject & Class Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subject Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Subject</p>
                <p className="text-sm text-muted-foreground">
                  {exam.subject.name}
                  {exam.subject.code && ` (${exam.subject.code})`}
                </p>
              </div>
              
              {exam.class && (
                <div>
                  <p className="text-sm font-medium">Class</p>
                  <p className="text-sm text-muted-foreground">{exam.class.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                disabled={!canStart}
                onClick={() => router.push(`/dashboard/student/exams/${exam.id}`)}
              >
                {status === 'upcoming' ? 'Exam Not Started' : 
                 status === 'in-progress' ? 'Start Exam' : 'Exam Completed'}
              </Button>
              
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/student/exams/${exam.id}/results`}>
                  View Results
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/student">
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Badge 
                  variant={status === 'in-progress' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'}
                  className="text-lg px-4 py-2"
                >
                  {status === 'upcoming' ? 'Upcoming' : 
                   status === 'in-progress' ? 'In Progress' : 'Completed'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {status === 'upcoming' && 'Exam will be available at the start time'}
                  {status === 'in-progress' && 'You can start the exam now'}
                  {status === 'completed' && 'This exam has ended'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
