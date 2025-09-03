'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface ExamAnalytics {
  exam: {
    id: string;
    title: string;
    subject: string;
    class: string;
    totalMarks: number;
    totalQuestions: number;
    duration: number;
  };
  overallStats: {
    totalAttempts: number;
    averageScore: number;
    averagePercentage: number;
    highestScore: number;
    lowestScore: number;
    highestPercentage: number;
    lowestPercentage: number;
    passingRate: number;
  };
  gradeDistribution: string[];
  gradeCounts: Record<string, number>;
  difficultyStats: {
    EASY: { total: number; correct: number; accuracy: number };
    MEDIUM: { total: number; correct: number; accuracy: number };
    HARD: { total: number; correct: number; accuracy: number };
  };
  questionAnalytics: Array<{
    questionId: string;
    questionText: string;
    marks: number;
    difficulty: string;
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number;
    averageTimeSpent: number;
    skippedCount: number;
  }>;
  topPerformers: Array<{
    name: string;
    rollNo: string;
    score: number;
    totalMarks: number;
    percentage: number;
    timeSpent: number | null;
  }>;
  bottomPerformers: Array<{
    name: string;
    rollNo: string;
    score: number;
    totalMarks: number;
    percentage: number;
    timeSpent: number | null;
  }>;
  generatedAt: string;
}

export default function ExamAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const examId = resolvedParams.id as string;
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exams/${examId}/analytics`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [examId]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load analytics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
          <p className="text-muted-foreground">
            {analytics.exam.title} • {analytics.exam.subject} • {analytics.exam.class}
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overallStats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.exam.totalQuestions} questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overallStats.averagePercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overallStats.averageScore.toFixed(1)}/{analytics.exam.totalMarks} marks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passing Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overallStats.passingRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Students who passed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Range</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overallStats.lowestPercentage.toFixed(1)}% - {analytics.overallStats.highestPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Lowest to highest
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Grade Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.gradeCounts).map(([grade, count]) => (
              <div key={grade} className="text-center">
                <Badge className={getGradeColor(grade)}>
                  {grade}
                </Badge>
                <div className="text-2xl font-bold mt-2">{count}</div>
                <div className="text-sm text-muted-foreground">
                  {((count / analytics.overallStats.totalAttempts) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance by Difficulty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance by Difficulty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.difficultyStats).map(([difficulty, stats]) => (
              <div key={difficulty} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={getDifficultyColor(difficulty)}>
                    {difficulty}
                  </Badge>
                  <span className="text-sm font-medium">{stats.accuracy.toFixed(1)}% accuracy</span>
                </div>
                <Progress value={stats.accuracy} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {stats.correct} correct out of {stats.total} attempts
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-green-700">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{performer.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Roll No: {performer.rollNo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700">{performer.percentage.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">
                      {performer.score}/{performer.totalMarks} marks
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Need Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.bottomPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-red-700">
                        {analytics.bottomPerformers.length - index}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{performer.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Roll No: {performer.rollNo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-700">{performer.percentage.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">
                      {performer.score}/{performer.totalMarks} marks
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question-wise Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Question-wise Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.questionAnalytics.map((question, index) => (
              <div key={question.questionId} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium">Question {index + 1}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {question.questionText.length > 100 
                        ? `${question.questionText.substring(0, 100)}...` 
                        : question.questionText}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      {question.marks} marks
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Accuracy:</span> {question.accuracy.toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-medium">Correct:</span> {question.correctAnswers}/{question.totalAnswers}
                  </div>
                  <div>
                    <span className="font-medium">Skipped:</span> {question.skippedCount}
                  </div>
                  <div>
                    <span className="font-medium">Avg Time:</span> {question.averageTimeSpent}s
                  </div>
                </div>
                
                <Progress value={question.accuracy} className="mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated timestamp */}
      <div className="text-center text-sm text-muted-foreground">
        Analytics generated at {new Date(analytics.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
