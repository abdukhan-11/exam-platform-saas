'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ExamResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ score: number; totalMarks: number; percentage: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!examId) return;
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/results/exams/${examId}/mine`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load results');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  if (!examId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && data && (
            <div className="space-y-2">
              <div className="text-lg">Score: <strong>{data.score}</strong> / {data.totalMarks}</div>
              <div className="text-lg">Percentage: <strong>{Math.round(data.percentage)}%</strong></div>
              <Button className="mt-4" onClick={() => router.push('/dashboard/student')}>Back to Dashboard</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
