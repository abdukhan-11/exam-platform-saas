'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  BookOpen,
  CheckCircle,
  PenTool,
  Trophy,
  Edit,
  Play,
  CalendarDays
} from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  type: 'test' | 'exam' | 'quiz';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  duration: number; // in minutes
  totalMarks: number;
  scheduledDate?: string;
  questionsCount: number;
  participantsCount?: number;
}

export default function CalendarPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

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
          status: 'scheduled',
          duration: 90,
          totalMarks: 100,
          scheduledDate: '2024-01-22T09:00:00',
          questionsCount: 40,
          participantsCount: 2
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
        },
        {
          id: '4',
          title: 'Chemistry Lab Test',
          subject: 'Chemistry',
          class: 'Class 3rd',
          type: 'test',
          status: 'completed',
          duration: 45,
          totalMarks: 75,
          scheduledDate: '2024-01-15T14:00:00',
          questionsCount: 25,
          participantsCount: 1
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test': return <PenTool className="h-4 w-4" />;
      case 'exam': return <BookOpen className="h-4 w-4" />;
      case 'quiz': return <CheckCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const upcomingExams = exams.filter(exam => exam.status === 'scheduled');
  const draftExams = exams.filter(exam => exam.status === 'draft');
  const completedExams = exams.filter(exam => exam.status === 'completed');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Exam/Test Creation</h1>
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
          <h1 className="text-3xl font-bold">Academic Calendar</h1>
          <p className="text-muted-foreground">View and manage scheduled exams, events, and important dates</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
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
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftExams.length}</div>
            <p className="text-xs text-muted-foreground">Being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedExams.length}</div>
            <p className="text-xs text-muted-foreground">Finished exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Exams Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Exams</TabsTrigger>
          <TabsTrigger value="drafts">Draft Exams</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Exams & Tests</CardTitle>
              <CardDescription>Exams that are scheduled and ready for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming exams scheduled</p>
                </div>
              ) : (
                upcomingExams.map((exam) => (
                  <Card key={exam.id} className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(exam.type)}
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
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Play className="h-4 w-4 mr-2" />
                          Start Exam
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Draft Exams</CardTitle>
              <CardDescription>Exams being prepared - add questions and schedule them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {draftExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No draft exams</p>
                </div>
              ) : (
                draftExams.map((exam) => (
                  <Card key={exam.id} className="p-4 border-l-4 border-l-gray-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(exam.type)}
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
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Continue Editing
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Exams</CardTitle>
              <CardDescription>View results and performance analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed exams yet</p>
                </div>
              ) : (
                completedExams.map((exam) => (
                  <Card key={exam.id} className="p-4 border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(exam.type)}
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
                            <span className="font-medium">Participants:</span> {exam.participantsCount}
                          </div>
                          <div>
                            <span className="font-medium">Total Marks:</span> {exam.totalMarks}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Trophy className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
