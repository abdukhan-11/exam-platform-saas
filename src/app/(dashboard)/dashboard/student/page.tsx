"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Trophy,
  Clock,
  Target,
  Users,
  BarChart3,
  Star,
  Award,
  Bell,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ExamOverview = dynamic(() => import('@/components/student/ExamOverview'), { ssr: false });

interface DashboardStats {
  totalExams: number;
  completedExams: number;
  upcomingExams: number;
  averageScore: number;
  classPosition: number;
  totalStudents: number;
  subjectPerformance: Array<{
    subject: string;
    averagePercentage: number;
    rank: number;
    totalStudents: number;
  }>;
  recentAchievements: Array<{
    title: string;
    description: string;
    date: string;
    type: 'exam' | 'improvement' | 'streak' | 'perfect';
  }>;
  notifications?: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    createdAt: string;
    examId?: string;
    examTitle?: string;
    subject?: string;
  }>;
  impersonationInfo?: {
    isImpersonating: boolean;
    adminSession: boolean;
    originalStudent: {
      rollNo: string;
      name: string;
      class: string;
    };
  };
}

export default function StudentDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check for impersonation data
      const impersonationData = localStorage.getItem('impersonatingStudent');
      let impersonationInfo = null;
      
      if (impersonationData) {
        try {
          impersonationInfo = JSON.parse(impersonationData);
        } catch (e) {
          console.error('Failed to parse impersonation data');
        }
      }

      // Load dashboard statistics and notifications in parallel
      const [dashboardResponse, notificationsResponse] = await Promise.all([
        fetch('/api/students/dashboard', { cache: 'no-store' }),
        fetch('/api/students/exam-notifications?type=all', { cache: 'no-store' })
      ]);

      let dashboardData = null;
      let notifications = [];

      if (dashboardResponse.ok) {
        dashboardData = await dashboardResponse.json();
      }

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        notifications = notificationsData.notifications || [];
      }

      if (dashboardData) {
        setStats({
          ...dashboardData,
          impersonationInfo,
          notifications
        });
      } else {
        // Fallback with mock data for development
        setStats({
          totalExams: 12,
          completedExams: 8,
          upcomingExams: 4,
          averageScore: 87.5,
          classPosition: 3,
          totalStudents: 45,
          subjectPerformance: [
            { subject: 'Mathematics', averagePercentage: 92, rank: 2, totalStudents: 45 },
            { subject: 'Physics', averagePercentage: 88, rank: 4, totalStudents: 45 },
            { subject: 'English', averagePercentage: 85, rank: 5, totalStudents: 45 },
          ],
          recentAchievements: [
            { title: 'Perfect Score!', description: 'Mathematics Test - 100%', date: '2024-01-15', type: 'perfect' },
            { title: 'Improvement Streak', description: '5 consecutive improvements', date: '2024-01-10', type: 'improvement' },
          ],
          impersonationInfo,
          notifications
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'perfect': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'improvement': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'streak': return <Target className="h-4 w-4 text-blue-500" />;
      default: return <Award className="h-4 w-4 text-purple-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {greeting}! {stats?.impersonationInfo?.originalStudent?.name || 'Student'}
          </h1>
          <p className="text-muted-foreground">
            {stats?.impersonationInfo?.isImpersonating && stats?.impersonationInfo?.originalStudent
              ? `Viewing as: ${stats.impersonationInfo.originalStudent.rollNo} • ${stats.impersonationInfo.originalStudent.class}`
              : 'Welcome back to your dashboard'
            }
          </p>
        </div>
        {stats?.impersonationInfo?.isImpersonating && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Admin View Mode
          </Badge>
        )}
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.averageScore ?? 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {(stats?.averageScore ?? 0) >= 90 ? 'Excellent!' : (stats?.averageScore ?? 0) >= 80 ? 'Great work!' : 'Keep improving!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Position</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{stats?.classPosition}</div>
            <p className="text-xs text-muted-foreground">
              out of {stats?.totalStudents} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Exams</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedExams}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.upcomingExams} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exam Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedExams && stats?.totalExams 
                ? Math.round((stats.completedExams / stats.totalExams) * 100) 
                : 0}%
            </div>
            <Progress 
              value={stats?.completedExams && stats?.totalExams 
                ? (stats.completedExams / stats.totalExams) * 100 
                : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subject Performance
            </CardTitle>
            <CardDescription>Your performance across different subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.subjectPerformance.map((subject, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">
                        {subject.subject.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{subject.subject}</h4>
                      <p className="text-sm text-muted-foreground">
                        Rank #{subject.rank} of {subject.totalStudents}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{subject.averagePercentage}%</div>
                    <Badge 
                      variant={subject.averagePercentage >= 90 ? 'default' : subject.averagePercentage >= 80 ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {subject.averagePercentage >= 90 ? 'Excellent' : subject.averagePercentage >= 80 ? 'Good' : 'Fair'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button asChild className="w-full" variant="outline">
                <Link href="/dashboard/student/history">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications and Achievements */}
        <div className="space-y-6">
          {/* Exam Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Exam Notifications
              </CardTitle>
              <CardDescription>Important exam updates and reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.notifications && stats.notifications.length > 0 ? (
                  stats.notifications.slice(0, 3).map((notification, index) => (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
                      notification.priority === 'high' ? 'bg-red-50 border border-red-200' :
                      notification.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      {notification.type === 'exam_result' ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className={`h-4 w-4 mt-0.5 ${
                          notification.priority === 'high' ? 'text-red-600' :
                          notification.priority === 'medium' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Bell className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                )}
              </div>
              {stats?.notifications && stats.notifications.length > 3 && (
                <div className="mt-4 pt-4 border-t">
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/dashboard/student/calendar">
                      <Bell className="h-4 w-4 mr-2" />
                      View All Notifications
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
              <CardDescription>Your latest accomplishments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentAchievements.length ? (
                  stats.recentAchievements.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {getAchievementIcon(achievement.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(achievement.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">No recent achievements</p>
                    <p className="text-xs text-muted-foreground">Complete exams to earn badges!</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard/student/awards">
                    <Trophy className="h-4 w-4 mr-2" />
                    View All Awards
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Exams
            </CardTitle>
            <CardDescription>View your exam schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {stats?.upcomingExams} exams scheduled for this month
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/student/calendar">
                View Calendar
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Class Rankings
            </CardTitle>
            <CardDescription>See how you compare</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You're currently ranked #{stats?.classPosition} in your class
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/student/awards">
                View Rankings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends
            </CardTitle>
            <CardDescription>Track your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View detailed analytics and performance insights
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/student/performance">
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Exam Overview Section */}
      <div className="mt-10">
        <ExamOverview />
      </div>
    </div>
  );
}
