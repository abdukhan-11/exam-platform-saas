'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react';

interface LiveStats {
  exam: {
    id: string;
    title: string;
    subject: string;
    class: string;
    startTime: string;
    endTime: string;
    duration: number;
    totalMarks: number;
    status: 'active' | 'upcoming' | 'completed';
  };
  statistics: {
    totalAttempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    totalEnrolled: number;
    completionRate: number;
    participationRate: number;
    averageScore: number;
    timeRemaining: number;
  };
  recentSubmissions: Array<{
    id: string;
    studentName: string;
    rollNo: string;
    score: number;
    totalMarks: number;
    percentage: number;
    completedAt: string;
    timeSpent: number | null;
  }>;
  lastUpdated: string;
}

interface LiveExamMonitorProps {
  examId: string;
  refreshInterval?: number; // in milliseconds
}

export default function LiveExamMonitor({ examId, refreshInterval = 10000 }: LiveExamMonitorProps) {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchLiveStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exams/${examId}/live-stats`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    
    const interval = setInterval(fetchLiveStats, refreshInterval);
    return () => clearInterval(interval);
  }, [examId, refreshInterval]);

  const formatTimeRemaining = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Live Exam Monitor</h2>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Live Exam Monitor</h2>
          <Button onClick={fetchLiveStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load live stats: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Live Exam Monitor</h2>
          <p className="text-muted-foreground">
            {stats.exam.title} • {stats.exam.subject} • {stats.exam.class}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(stats.exam.status)}>
            {stats.exam.status.toUpperCase()}
          </Badge>
          <Button onClick={fetchLiveStats} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Remaining */}
      {stats.exam.status === 'active' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-orange-800">Time Remaining:</span>
              </div>
              <span className="text-2xl font-bold text-orange-800 font-mono">
                {formatTimeRemaining(stats.statistics.timeRemaining)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statistics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.statistics.totalEnrolled} enrolled
            </p>
            <Progress 
              value={stats.statistics.participationRate} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.statistics.participationRate.toFixed(1)}% participation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statistics.completedAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.statistics.inProgressAttempts} in progress
            </p>
            <Progress 
              value={stats.statistics.completionRate} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.statistics.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statistics.averageScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats.exam.totalMarks} total marks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastRefresh.toLocaleTimeString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-refresh every {refreshInterval / 1000}s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">
                        {submission.studentName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{submission.studentName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Roll No: {submission.rollNo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{submission.percentage.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">
                      {submission.score}/{submission.totalMarks} marks
                    </p>
                    {submission.timeSpent && (
                      <p className="text-xs text-muted-foreground">
                        {submission.timeSpent} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No submissions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
