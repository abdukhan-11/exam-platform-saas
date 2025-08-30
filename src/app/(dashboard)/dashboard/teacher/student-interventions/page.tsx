'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertTriangle, Info, BookOpen, Calendar, Users, Clock } from 'lucide-react';

export default function StudentInterventionsPage() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interventionData, setInterventionData] = useState<any>(null);

  const handleFetchInterventions = async () => {
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch from the API
      // const response = await fetch(`/api/students/${studentId}/interventions`);
      // if (!response.ok) throw new Error('Failed to fetch intervention data');
      // const data = await response.json();
      
      // For demo purposes, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulated response data
      setInterventionData({
        student: {
          id: studentId,
          name: 'John Doe'
        },
        recommendations: {
          userId: studentId,
          recommendationType: 'moderate',
          reason: 'Performance is showing a slight downward trend',
          suggestedActions: [
            'Monitor progress more frequently',
            'Offer optional additional support',
            'Focus improvement efforts on: Chemistry, Biology',
            'Potential for significant gains in: English'
          ],
          targetAreas: ['Chemistry', 'Biology']
        },
        recentPerformance: [
          {
            examTitle: 'Mid-term Assessment',
            subjectName: 'Chemistry',
            percentage: 65.7,
            score: 46,
            totalMarks: 70,
            date: '2025-08-15T14:30:00Z'
          },
          {
            examTitle: 'Weekly Quiz',
            subjectName: 'Mathematics',
            percentage: 78.5,
            score: 31,
            totalMarks: 40,
            date: '2025-08-10T10:15:00Z'
          },
          {
            examTitle: 'Chapter Test',
            subjectName: 'Biology',
            percentage: 68.2,
            score: 34,
            totalMarks: 50,
            date: '2025-08-05T09:00:00Z'
          }
        ],
        resources: [
          {
            title: 'Peer Tutoring Program',
            type: 'support',
            description: 'Connect with peer tutors who excel in your challenging subjects.'
          },
          {
            title: 'Chemistry Lab Tutorials',
            type: 'material',
            description: 'Video tutorials explaining key chemistry concepts and laboratory techniques.',
            url: '/resources/chemistry-labs'
          },
          {
            title: 'Biology Visual Guides',
            type: 'material',
            description: 'Illustrated guides to biological processes and systems.',
            url: '/resources/biology-visuals'
          },
          {
            title: 'English Writing Workshop',
            type: 'workshop',
            description: 'Workshop focusing on improving writing skills and grammar.',
            url: '/resources/english-writing'
          }
        ]
      });
    } catch (err) {
      setError('Failed to fetch intervention data');
      console.error('Error fetching interventions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'moderate': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'monitoring': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'material': return <BookOpen className="h-4 w-4" />;
      case 'workshop': return <Users className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'support': return <Users className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Student Interventions</h1>
      <p className="text-muted-foreground">
        Generate intervention recommendations for students based on performance patterns.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Student Lookup</CardTitle>
          <CardDescription>Enter a student ID to generate intervention recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleFetchInterventions} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Recommendations'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {interventionData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Intervention Summary</CardTitle>
                  <CardDescription>
                    Recommendations for {interventionData.student.name}
                  </CardDescription>
                </div>
                <Badge
                  className={`${getRecommendationColor(interventionData.recommendations.recommendationType)} capitalize`}
                >
                  {interventionData.recommendations.recommendationType} Intervention
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Reason</h3>
                  <p>{interventionData.recommendations.reason}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Suggested Actions</h3>
                  <ul className="space-y-2">
                    {interventionData.recommendations.suggestedActions.map((action: string, i: number) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Target Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {interventionData.recommendations.targetAreas.map((area: string, i: number) => (
                      <Badge key={i} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
                <CardDescription>
                  Last {interventionData.recentPerformance.length} exams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interventionData.recentPerformance.map((exam: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-md border">
                      <div>
                        <div className="font-medium">{exam.examTitle}</div>
                        <div className="text-sm text-muted-foreground">{exam.subjectName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{exam.percentage.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">{exam.score}/{exam.totalMarks}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Resources</CardTitle>
                <CardDescription>
                  Resources to help improve performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interventionData.resources.map((resource: any, i: number) => (
                    <div key={i} className="p-3 rounded-md border">
                      <div className="flex items-center gap-2 mb-1">
                        {getResourceIcon(resource.type)}
                        <div className="font-medium">{resource.title}</div>
                        <Badge variant="outline" className="ml-auto capitalize">{resource.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{resource.description}</p>
                      {resource.url && (
                        <Button variant="link" className="p-0 h-auto mt-1" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">View Resource</a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline">Save Recommendations</Button>
            <Button>Send Intervention Plan</Button>
          </div>
        </div>
      )}
    </div>
  );
}
