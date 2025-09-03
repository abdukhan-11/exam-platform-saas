'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  BarChart3, 
  Clock, 
  TrendingUp,
  Award,
  Eye,
  Edit,
  Play
} from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  type: 'test' | 'exam' | 'quiz';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  duration: number;
  totalMarks: number;
  scheduledDate?: string;
  questionsCount: number;
  participantsCount?: number;
  averageScore?: number;
}

export default function TeacherDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Mock data - in real app, this would come from API
    setTimeout(() => {
      const mockExams: Exam[] = [
        {
          id: '1',
          title: 'Mathematics Test - Chapter 1',
          subject: 'Math',
          class: 'Class 1st',
          type: 'test',
          status: 'scheduled',
          duration: 30,
          totalMarks: 50,
          scheduledDate: '2024-01-20T10:00:00',
          questionsCount: 20,
          participantsCount: 3
        },
        {
          id: '2',
          title: 'Physics Mid-Term Exam',
          subject: 'Physics',
          class: 'Class 2nd',
          type: 'exam',
          status: 'completed',
          duration: 90,
          totalMarks: 100,
          scheduledDate: '2024-01-15T09:00:00',
          questionsCount: 40,
          participantsCount: 2,
          averageScore: 85
        },
        {
          id: '3',
          title: 'Urdu Quick Quiz',
          subject: 'Urdu',
          class: 'Class 1st',
          type: 'quiz',
          status: 'draft',
          duration: 15,
          totalMarks: 25,
          questionsCount: 10
        }
      ];
      setExams(mockExams);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const upcomingExams = exams.filter(exam => exam.status === 'scheduled');
  const completedExams = exams.filter(exam => exam.status === 'completed');
  const draftExams = exams.filter(exam => exam.status === 'draft');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your exams, students, and analytics</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExams.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled exams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedExams.length}</div>
            <p className="text-xs text-muted-foreground">Finished exams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedExams.length > 0 
                ? Math.round(completedExams.reduce((sum, exam) => sum + (exam.averageScore || 0), 0) / completedExams.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="exams">My Exams</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Exams</CardTitle>
                <CardDescription>Your latest exam activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {exams.slice(0, 3).map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{exam.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {exam.class} • {exam.subject} • {exam.duration} mins
                      </p>
                    </div>
                    <Badge className={getStatusColor(exam.status)}>
                      {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Create New Exam
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View Students
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Questions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Exams</CardTitle>
              <CardDescription>Manage all your created exams and tests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No exams created yet</p>
                </div>
              ) : (
                exams.map((exam) => (
                  <Card key={exam.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{exam.title}</h3>
                          <Badge className={getStatusColor(exam.status)}>
                            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">
                            {exam.class}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Subject:</span> {exam.subject}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {exam.duration} mins
                          </div>
                          <div>
                            <span className="font-medium">Questions:</span> {exam.questionsCount}
                          </div>
                          <div>
                            <span className="font-medium">Total Marks:</span> {exam.totalMarks}
                          </div>
                          {exam.scheduledDate && (
                            <div className="col-span-2">
                              <span className="font-medium">Scheduled:</span> {new Date(exam.scheduledDate).toLocaleString()}
                            </div>
                          )}
                          {exam.participantsCount && (
                            <div>
                              <span className="font-medium">Students:</span> {exam.participantsCount}
                            </div>
                          )}
                          {exam.averageScore && (
                            <div>
                              <span className="font-medium">Average Score:</span> {exam.averageScore}%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        {exam.status === 'scheduled' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Analytics</CardTitle>
              <CardDescription>Performance insights and student progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm">View detailed performance metrics and student progress</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
