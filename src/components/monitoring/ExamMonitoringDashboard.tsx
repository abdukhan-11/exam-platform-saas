'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Shield,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { getSocket } from '@/lib/realtime';
import { CheatingAlert, StudentData, DashboardData } from '@/lib/types/exam-monitoring';

interface ExamMonitoringDashboardProps {
  examId: string;
  onClose?: () => void;
}

export default function ExamMonitoringDashboard({ examId, onClose }: ExamMonitoringDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [alerts, setAlerts] = useState<CheatingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const touchStartXRef = React.useRef<number | null>(null);
  const touchEndXRef = React.useRef<number | null>(null);
  const tabsOrder = ['overview', 'students', 'alerts', 'analytics'] as const;

  // Initialize Socket.io connection
  useEffect(() => {
    const socket = getSocket('/exam-monitoring');

    // Join exam monitoring room
    socket.emit('subscribe-exam', examId);

    // Listen for real-time updates
    socket.on('exam-status', (data) => {
      setDashboardData(prev => prev ? { ...prev, realTime: data } : null);
      setLastUpdate(new Date());
    });

    socket.on('student-joined', (data) => {
      console.log('Student joined:', data);
      loadStudents(); // Refresh students list
    });

    socket.on('student-disconnected', (data) => {
      console.log('Student disconnected:', data);
      loadStudents(); // Refresh students list
    });

    socket.on('exam-submitted', (data) => {
      console.log('Exam submitted:', data);
      loadDashboardData(); // Refresh dashboard
    });

    socket.on('cheating-alert', (alert: CheatingAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
      loadAlerts(); // Refresh alerts list
    });

    return () => {
      socket.off('exam-status');
      socket.off('student-joined');
      socket.off('student-disconnected');
      socket.off('exam-submitted');
      socket.off('cheating-alert');
    };
  }, [examId]);

  // Load initial data
  useEffect(() => {
    // Defer until after function bindings exist
    const t = setTimeout(() => {
      loadDashboardData();
      loadStudents();
      loadAlerts();
    }, 0);
    return () => clearTimeout(t);
  }, [examId]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`/api/monitoring/exams/${examId}`);
      if (!response.ok) throw new Error('Failed to load dashboard data');

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await fetch(`/api/monitoring/exams/${examId}/students`);
      if (!response.ok) throw new Error('Failed to load students');

      const data = await response.json();
      setStudents(data.students);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch(`/api/monitoring/exams/${examId}/alerts`);
      if (!response.ok) throw new Error('Failed to load alerts');

      const data = await response.json();
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  const refreshData = useCallback(() => {
    loadDashboardData();
    loadStudents();
    loadAlerts();
    setLastUpdate(new Date());
  }, [examId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-busy="true" aria-live="polite" aria-label="Loading dashboard">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
        <span className="ml-2">Loading dashboard…</span>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load dashboard data'}
        </AlertDescription>
      </Alert>
    );
  }

  // Mobile swipe handlers for tab navigation
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchEndXRef.current = null;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = () => {
    const start = touchStartXRef.current;
    const end = touchEndXRef.current;
    if (start == null || end == null) return;
    const delta = end - start;
    const threshold = 48; // px
    if (Math.abs(delta) < threshold) return;
    // Only enable on small screens
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
    const idx = tabsOrder.indexOf(activeTab as typeof tabsOrder[number]);
    if (idx === -1) return;
    if (delta < 0 && idx < tabsOrder.length - 1) {
      setActiveTab(tabsOrder[idx + 1]);
    } else if (delta > 0 && idx > 0) {
      setActiveTab(tabsOrder[idx - 1]);
    }
  };

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto overscroll-contain"
      role="region"
      aria-label="Exam monitoring dashboard"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{dashboardData.exam.title}</h1>
          <p className="text-gray-600 text-sm sm:text-base">{dashboardData.exam.subject}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={
              dashboardData.exam.status === 'active' ? 'default' :
              dashboardData.exam.status === 'completed' ? 'secondary' : 'outline'
            }>
              {dashboardData.exam.status.toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-500" aria-live="polite">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline" size="sm" aria-label="Refresh data">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm" aria-label="Close dashboard">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.realTime.activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.realTime.connectedStudents} connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(dashboardData.summary.completionRate)}%</div>
            <Progress value={dashboardData.summary.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.alerts.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.alerts.recent} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(dashboardData.summary.timeRemaining / 60)}h {dashboardData.summary.timeRemaining % 60}m
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.exam.status === 'active' ? 'Exam in progress' : 'Exam not started'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" aria-label="Dashboard sections">
        <TabsList className="grid w-full grid-cols-4" aria-label="Tabs">
          <TabsTrigger value="overview" aria-label="Overview">Overview</TabsTrigger>
          <TabsTrigger value="students" aria-label="Students">Students</TabsTrigger>
          <TabsTrigger value="alerts" aria-label="Alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics" aria-label="Analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Real-time Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4" aria-live="polite">
                <div className="flex justify-between">
                  <span>Connected Students:</span>
                  <span className="font-medium">{dashboardData.realTime.connectedStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Students:</span>
                  <span className="font-medium">{dashboardData.realTime.activeStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium">{dashboardData.realTime.completedStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disconnected:</span>
                  <span className="font-medium">{dashboardData.realTime.disconnectedStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Progress:</span>
                  <span className="font-medium">{dashboardData.realTime.averageProgress}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Alert Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Alert Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Alerts:</span>
                  <span className="font-medium">{dashboardData.alerts.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <Badge variant="destructive">{dashboardData.alerts.bySeverity.critical || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>High:</span>
                  <Badge variant="destructive">{dashboardData.alerts.bySeverity.high || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Medium:</span>
                  <Badge variant="secondary">{dashboardData.alerts.bySeverity.medium || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Low:</span>
                  <Badge variant="outline">{dashboardData.alerts.bySeverity.low || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent aria-live="polite">
              {dashboardData.alerts.latest.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent alerts</p>
              ) : (
                <div className="space-y-2">
                  {dashboardData.alerts.latest.slice(0, 5).map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{alert.alertType}</span>
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Connected Students ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No students connected</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => (
                    <div key={student.userId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-600">
                          Roll: {student.rollNo || 'N/A'} •
                          Status: <Badge variant={
                            student.session.status === 'active' ? 'default' :
                            student.session.status === 'completed' ? 'secondary' : 'destructive'
                          }>{student.session.status}</Badge>
                        </div>
                        {student.progress && (
                          <div className="text-sm text-gray-600">
                            Score: {student.progress.score}{student.progress.totalMarks !== undefined ? `/${student.progress.totalMarks}` : ''} •
                            Time: {Math.floor(student.progress.timeSpent / 60)}m {student.progress.timeSpent % 60}s
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Alerts: {student.alerts.total}
                        </div>
                        {student.alerts.critical > 0 && (
                          <Badge variant="destructive">Critical: {student.alerts.critical}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Cheating Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent aria-live="polite">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No alerts detected</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{alert.alertType}</span>
                        </div>
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'high' ? 'destructive' : 'secondary'
                        }>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Student ID: {alert.userId} •
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                      {alert.details && (
                        <div className="text-sm mt-2 p-2 bg-gray-50 rounded">
                          {JSON.stringify(alert.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Students:</span>
                  <span className="font-medium">{dashboardData.summary.totalEnrolled}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Rate:</span>
                  <span className="font-medium">{Math.round(dashboardData.summary.completionRate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Score:</span>
                  <span className="font-medium">{dashboardData.summary.averageScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Questions:</span>
                  <span className="font-medium">{dashboardData.exam.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Marks:</span>
                  <span className="font-medium">{dashboardData.exam.totalMarks}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exam Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Progress</span>
                      <span>{Math.round((Date.now() - new Date(dashboardData.exam.startTime).getTime()) /
                        (new Date(dashboardData.exam.endTime).getTime() - new Date(dashboardData.exam.startTime).getTime()) * 100)}%</span>
                    </div>
                    <Progress value={
                      (Date.now() - new Date(dashboardData.exam.startTime).getTime()) /
                      (new Date(dashboardData.exam.endTime).getTime() - new Date(dashboardData.exam.startTime).getTime()) * 100
                    } />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Student Progress</span>
                      <span>{dashboardData.realTime.averageProgress}%</span>
                    </div>
                    <Progress value={dashboardData.realTime.averageProgress} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
