'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Trophy, 
  Users, 
  Download, 
  Eye,
  Award,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface ExamResult {
  id: string;
  title: string;
  subject: string;
  class: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  topScore: number;
  status: 'completed' | 'ongoing' | 'scheduled';
  completedAt?: string;
}

interface AwardList {
  id: string;
  examId: string;
  examTitle: string;
  type: 'exam-specific' | 'subject-cumulative' | 'class-overall';
  generatedAt: string;
  topPerformers: Array<{
    rank: number;
    studentName: string;
    rollNo: string;
    score: number;
    percentage: number;
  }>;
}

export default function ReportsPage() {
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [awardLists, setAwardLists] = useState<AwardList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load completed exams with results
      const examsResponse = await fetch('/api/exams?status=completed');
      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        setExams(examsData.exams || []);
      }

      // Load existing award lists
      const awardsResponse = await fetch('/api/awards/generate');
      if (awardsResponse.ok) {
        const awardsData = await awardsResponse.json();
        setAwardLists(awardsData.awardLists || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAwardList = async (examId: string, type: 'exam-specific' | 'subject-cumulative' | 'class-overall') => {
    try {
      const response = await fetch('/api/awards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, type })
      });

      if (response.ok) {
        const newAwardList = await response.json();
        setAwardLists(prev => [newAwardList, ...prev]);
        alert('Award list generated successfully!');
      } else {
        throw new Error('Failed to generate award list');
      }
    } catch (error) {
      console.error('Error generating award list:', error);
      alert('Failed to generate award list. Please try again.');
    }
  };

  const exportResults = async (examId: string, format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/exams/${examId}/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-results-${examId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to export results');
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results. Please try again.');
    }
  };

  const shareAwardListWithStudents = async (examId: string) => {
    try {
      const response = await fetch(`/api/exams/${examId}/share-awards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('🎉 Award list shared with students! They can now view rankings in their dashboard.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share award list');
      }
    } catch (error) {
      console.error('Error sharing award list:', error);
      alert('Failed to share award list. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Awards</h1>
          <p className="text-muted-foreground">Loading reports and awards...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Awards</h1>
        <p className="text-muted-foreground">
          Generate reports, view results, and manage awards for your college
        </p>
      </div>

      <Tabs defaultValue="results" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">Exam Results</TabsTrigger>
          <TabsTrigger value="awards">Award Lists</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-6">
          <div className="grid gap-6">
            {exams.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Exams</h3>
                  <p className="text-muted-foreground">
                    Complete some exams to view results and generate reports.
                  </p>
                </CardContent>
              </Card>
            ) : (
              exams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          {exam.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {exam.subject} • {exam.class}
                        </p>
                      </div>
                      <Badge variant={exam.status === 'completed' ? 'default' : 'secondary'}>
                        {exam.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{exam.totalStudents}</div>
                        <div className="text-sm text-muted-foreground">Total Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{exam.completedStudents}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{exam.averageScore.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">Average Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{exam.topScore}</div>
                        <div className="text-sm text-muted-foreground">Top Score</div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/dashboard/teacher/exam-analytics?examId=${exam.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateAwardList(exam.id, 'exam-specific')}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Generate Awards
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => shareAwardListWithStudents(exam.id)}
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Share with Students
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportResults(exam.id, 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportResults(exam.id, 'excel')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="awards" className="space-y-6">
          <div className="grid gap-6">
            {awardLists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Award Lists Generated</h3>
                  <p className="text-muted-foreground">
                    Generate award lists from completed exams to view rankings and top performers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              awardLists.map((awardList) => (
                <Card key={awardList.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          {awardList.examTitle}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {awardList.type.replace('-', ' ').toUpperCase()} • 
                          Generated: {new Date(awardList.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {awardList.topPerformers.length} Students
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {awardList.topPerformers.slice(0, 5).map((performer) => (
                        <div key={performer.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              performer.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                              performer.rank === 2 ? 'bg-gray-100 text-gray-800' :
                              performer.rank === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {performer.rank}
                            </div>
                            <div>
                              <div className="font-medium">{performer.studentName}</div>
                              <div className="text-sm text-muted-foreground">Roll: {performer.rollNo}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{performer.score} marks</div>
                            <div className="text-sm text-muted-foreground">{performer.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/dashboard/student/awards?listId=${awardList.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full List
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportResults(awardList.examId, 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Awards
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View performance trends across subjects and classes
                </p>
                <Button className="w-full mt-4" variant="outline">
                  View Trends
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Class Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Compare performance across different classes
                </p>
                <Button className="w-full mt-4" variant="outline">
                  View Class Analytics
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Historical Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Access historical exam data and reports
                </p>
                <Button className="w-full mt-4" variant="outline">
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}