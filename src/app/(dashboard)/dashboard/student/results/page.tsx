'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PerformanceCharts from '@/components/student/PerformanceCharts';

export default function StudentResultsPage() {
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/results/personal', { cache: 'no-store' });
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
  }, []);

  const items = (data?.items ?? []) as Array<{
    id: string
    examId: string
    examTitle: string
    subjectId: string
    subjectName: string
    subjectCode: string | null
    date: string | Date
    score: number
    totalMarks: number
    percentage: number
    timeTakenSec: number | null
    isCompleted: boolean
  }>;
  const subjectAnalytics = (data?.subjectAnalytics ?? []) as Array<{
    subjectId: string
    subjectName: string
    correct: number
    incorrect: number
    accuracy: number
  }>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Results</h1>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading charts…</div>
          ) : error ? (
            <div className="text-sm text-destructive">Failed to load performance charts</div>
          ) : (
            <PerformanceCharts results={items} subjectAnalytics={subjectAnalytics} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading results…</div>
          ) : error ? (
            <div className="text-sm text-destructive">Failed to load results</div>
          ) : items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Exam</th>
                    <th className="py-2 pr-2">Subject</th>
                    <th className="py-2 pr-2">Score</th>
                    <th className="py-2 pr-2">%</th>
                    <th className="py-2 pr-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-2 whitespace-nowrap">{new Date(r.date).toLocaleString()}</td>
                      <td className="py-2 pr-2">{r.examTitle}</td>
                      <td className="py-2 pr-2">{r.subjectName}</td>
                      <td className="py-2 pr-2">{r.score}/{r.totalMarks}</td>
                      <td className="py-2 pr-2">{r.percentage.toFixed(2)}%</td>
                      <td className="py-2 pr-2">{r.timeTakenSec != null ? `${Math.round(r.timeTakenSec / 60)} min` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No results yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
