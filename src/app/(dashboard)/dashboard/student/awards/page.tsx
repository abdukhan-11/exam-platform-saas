'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SubjectAvg = { subjectId: string; subjectName: string; subjectCode?: string | null; averagePercentage: number };
type SubjectRank = { subjectId: string; subjectName: string; rank: number; of: number };
type ClassRanking = { position: number; of: number } | null;

export default function AwardsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallAverage, setOverallAverage] = useState<number>(0);
  const [classRanking, setClassRanking] = useState<ClassRanking>(null);
  const [subjectAverages, setSubjectAverages] = useState<SubjectAvg[]>([]);
  const [subjectRankings, setSubjectRankings] = useState<SubjectRank[]>([]);
  const [badges, setBadges] = useState<Array<{ key: string; label: string }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/awards/student', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load awards');
        const data = await res.json();
        setOverallAverage(data.overallAverage ?? 0);
        setClassRanking(data.classRanking ?? null);
        setSubjectAverages(data.subjectAverages ?? []);
        setSubjectRankings(data.subjectRankings ?? []);
        setBadges(data.badges ?? []);
      } catch (e: any) {
        setError(e?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const orderedSubjects = useMemo(() => {
    return [...subjectAverages].sort((a, b) => (b.averagePercentage - a.averagePercentage));
  }, [subjectAverages]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Awards & Rankings</h1>
        <p className="text-sm text-muted-foreground">Your achievements, class position, and subject-wise rankings.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading awards…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" aria-label={`overall-average-${Math.round(overallAverage)}`}>{overallAverage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Average across all completed exams.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Class Position</CardTitle>
              </CardHeader>
              <CardContent>
                {classRanking ? (
                  <div className="text-3xl font-bold" aria-label={`class-position-${classRanking.position}-of-${classRanking.of}`}>{classRanking.position} / {classRanking.of}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">No active class or insufficient data.</div>
                )}
                <p className="text-xs text-muted-foreground">Based on class average performance.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {badges.length ? badges.map((b) => (
                  <Badge key={b.key}>{b.label}</Badge>
                )) : (
                  <div className="text-sm text-muted-foreground">No badges yet. Keep going!</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {orderedSubjects.length === 0 ? (
                <div className="text-sm text-muted-foreground">No subject performance yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Average %</TableHead>
                        <TableHead>Class Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedSubjects.map((s) => {
                        const rank = subjectRankings.find((r) => r.subjectId === s.subjectId);
                        return (
                          <TableRow key={s.subjectId}>
                            <TableCell>{s.subjectName}{s.subjectCode ? ` (${s.subjectCode})` : ''}</TableCell>
                            <TableCell>{s.averagePercentage.toFixed(1)}%</TableCell>
                            <TableCell>{rank ? `${rank.rank} / ${rank.of}` : '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


