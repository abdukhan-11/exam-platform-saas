'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const examId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;

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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{data.score}</div>
                  <div className="text-sm text-gray-600">Score Obtained</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{data.totalMarks}</div>
                  <div className="text-sm text-gray-600">Total Marks</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{Math.round(data.percentage)}%</div>
                  <div className="text-sm text-gray-600">Percentage</div>
                </div>
              </div>
              
              <div className="text-center py-4">
                {data.percentage >= 60 ? (
                  <div className="text-green-600 font-semibold">🎉 Congratulations! You Passed!</div>
                ) : (
                  <div className="text-orange-600 font-semibold">📚 Keep studying! You can do better next time.</div>
                )}
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push('/dashboard/student/exams')}>
                  View All Exams
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/student/awards')}>
                  View Rankings
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/student')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
