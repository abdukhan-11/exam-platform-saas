'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Award,
  Eye,
  Download,
  Filter
} from 'lucide-react';

interface ExamAnalytics {
  id: string;
  title: string;
  subject: string;
  class: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
  timeSpent: {
    average: number;
    min: number;
    max: number;
  };
  questionAnalysis: {
    questionId: string;
    question: string;
    correctAnswers: number;
    totalAnswers: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  studentPerformance: {
    studentId: string;
    studentName: string;
    score: number;
    percentage: number;
    timeSpent: number;
    rank: number;
  }[];
}

export default function ExamAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Mock data - in real app, this would come from API
    setTimeout(() => {
      const mockAnalytics: ExamAnalytics = {
        id: '1',
        title: 'Mathematics Test - Chapter 1',
        subject: 'Math',
        class: 'Class 1st',
        totalStudents: 25,
        completedStudents: 23,
        averageScore: 78.5,
        highestScore: 95,
        lowestScore: 45,
        completionRate: 92,
        timeSpent: {
          average: 28,
          min: 15,
          max: 35
        },
        questionAnalysis: [
          {
            questionId: '1',
            question: 'What is 2 + 2?',
            correctAnswers: 23,
            totalAnswers: 23,
            difficulty: 'easy'
          },
          {
            questionId: '2',
            question: 'Solve: 3x + 5 = 14',
            correctAnswers: 18,
            totalAnswers: 23,
            difficulty: 'medium'
          },
          {
            questionId: '3',
            question: 'Find the derivative of x²',
            correctAnswers: 12,
            totalAnswers: 23,
            difficulty: 'hard'
          }
        ],
        studentPerformance: [
          {
            studentId: '1',
            studentName: 'Ahmed Ali',
            score: 95,
            percentage: 95,
            timeSpent: 25,
            rank: 1
          },
          {
            studentId: '2',
            studentName: 'Fatima Khan',
            score: 88,
            percentage: 88,
            timeSpent: 30,
            rank: 2
          },
          {
            studentId: '3',
            studentName: 'Hassan Ahmed',
            score: 82,
            percentage: 82,
            timeSpent: 28,
            rank: 3
          }
        ]
      };
      setAnalytics(mockAnalytics);
      setLoading(false);
    }, 1000);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
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

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analytics data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
          <p className="text-muted-foreground">{analytics.title} - {analytics.class}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedStudents} of {analytics.totalStudents} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedStudents} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.timeSpent.average} min</div>
            <p className="text-xs text-muted-foreground">
              {analytics.timeSpent.min}-{analytics.timeSpent.max} min range
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Range</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.highestScore}%</div>
            <p className="text-xs text-muted-foreground">
              High: {analytics.highestScore}% | Low: {analytics.lowestScore}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Question Analysis</TabsTrigger>
          <TabsTrigger value="students">Student Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>How students performed overall</CardDescription>
        </CardHeader>
        <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">90-100% (Excellent)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">80-89% (Good)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">70-79% (Average)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Below 70% (Needs Improvement)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
          </div>
        </CardContent>
      </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Analysis</CardTitle>
                <CardDescription>How long students took to complete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quick (15-20 min)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Normal (21-30 min)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                      <span className="text-sm font-medium">60%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Slow (31+ min)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Question Analysis</CardTitle>
              <CardDescription>Performance breakdown by question</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.questionAnalysis.map((question, index) => (
                <div key={question.questionId} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">Question {index + 1}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{question.question}</p>
                    </div>
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className="font-medium">{question.correctAnswers}</span> / {question.totalAnswers} correct
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((question.correctAnswers / question.totalAnswers) * 100)}% accuracy
                      </span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(question.correctAnswers / question.totalAnswers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
        <Card>
          <CardHeader>
              <CardTitle>Student Performance</CardTitle>
              <CardDescription>Individual student results and rankings</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
                {analytics.studentPerformance.map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-medium">
                        {student.rank}
                </div>
                <div>
                        <h4 className="font-medium">{student.studentName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Time: {student.timeSpent} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(student.percentage)}`}>
                          {student.percentage}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {student.score} points
                </div>
                </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                </div>
              </div>
                ))}
              </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
