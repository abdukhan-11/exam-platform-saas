'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherExamAnalyticsPage() {
  const [examId, setExamId] = React.useState<string>('');
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/exams/${examId}/analytics`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [examId]);

  const summary = data as {
    examId: string
    participants: number
    completed: number
    completionRate: number
    averageScore: number
    averagePercentage: number
    averageCompletionTimeSec: number
    scoreDistribution: { bucket: string; count: number }[]
    questionDifficultyBreakdown: { difficulty: string; count: number }[]
  } | undefined;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Exam Analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle>Choose Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <input
              className="border rounded px-3 py-2 bg-background"
              placeholder="Enter Exam ID"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {examId && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-sm text-destructive">Failed to load analytics</div>
            ) : loading || !summary ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Participants</div>
                  <div className="font-medium">{summary.participants}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Completed</div>
                  <div className="font-medium">{summary.completed}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Completion Rate</div>
                  <div className="font-medium">{(summary.completionRate * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg %</div>
                  <div className="font-medium">{summary.averagePercentage.toFixed(2)}%</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
