'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Exam = {
  id: string;
  title: string;
  description?: string | null;
  startTime: string | Date;
  endTime: string | Date;
  subjectId: string;
  classId?: string | null;
  totalMarks: number;
  duration: number; // minutes
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type Status = 'upcoming' | 'in-progress' | 'completed' | 'expired';

function getStatus(exam: Exam, now: Date): Status {
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'in-progress';
  if (now > end) return 'completed';
  return 'expired';
}

function formatCountdown(target: Date, now: Date) {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function ExamOverview() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [examsRes, subjRes] = await Promise.all([
          fetch('/api/exams', { cache: 'no-store' }),
          fetch('/api/subjects', { cache: 'no-store' }),
        ]);
        const examsJson = await examsRes.json();
        setExams((examsJson?.items ?? []) as Exam[]);
        const subjJson = await subjRes.json();
        setSubjects((subjJson?.items ?? []) as Subject[]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load exams/subjects', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = exams.filter((e) => (subjectFilter === 'all' ? true : e.subjectId === subjectFilter));
    const searched = q ? list.filter((e) => `${e.title} ${subjectMap.get(e.subjectId)?.name ?? ''}`.toLowerCase().includes(q)) : list;
    if (statusFilter === 'all') return list;
    return searched.filter((e) => getStatus(e, now) === statusFilter);
  }, [exams, subjectFilter, statusFilter, now, subjectMap, query]);

  const onStartExam = (exam: Exam) => {
    // Navigate to exam taking flow (placeholder route)
    router.push(`/dashboard/student/exams/${exam.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Exam Overview</h2>
          <p className="text-sm text-muted-foreground">Browse available exams, filter by subject or status, and take quick actions.</p>
        </div>

        <div className="flex gap-2 items-end">
          <Input placeholder="Search exams…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-[220px]" />
          <select
            aria-label="Filter by subject"
            className="border rounded px-3 py-2 bg-background"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            className="border rounded px-3 py-2 bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-xs text-muted-foreground hidden md:inline">Need help? Click the ? icon in the header.</span>
        </div>
      </div>

      {loading ? (
        <div data-testid="loading" className="text-sm text-muted-foreground">Loading exams…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Exam list">
          {filtered.map((exam) => {
            const status = getStatus(exam, now);
            const start = new Date(exam.startTime);
            const end = new Date(exam.endTime);
            const subject = subjectMap.get(exam.subjectId);
            const canStart = status === 'in-progress';

            return (
              <Card key={exam.id} role="listitem">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate" title={exam.title}>{exam.title}</span>
                    <Badge variant={status === 'in-progress' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'}>
                      {status.replace('-', ' ')}
                    </Badge>
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {subject ? (
                      <span>{subject.name}{subject.code ? ` • ${subject.code}` : ''}</span>
                    ) : (
                      <span>Subject: {exam.subjectId}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Duration: {exam.duration} min • Total Marks: {exam.totalMarks}
                  </div>

                  {status === 'upcoming' && (
                    <div className="text-sm">
                      Starts in: <span className="font-mono" data-testid={`countdown-${exam.id}`}>{formatCountdown(start, now)}</span>
                    </div>
                  )}
                  {status === 'in-progress' && (
                    <div className="text-sm">
                      Ends in: <span className="font-mono">{formatCountdown(end, now)}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" disabled={!canStart} onClick={() => onStartExam(exam)} aria-disabled={!canStart}>
                      Start
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/student/exams/${exam.id}/details`}>Details</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/student/exams/${exam.id}/results`}>Results</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!filtered.length && (
            <div className="text-sm text-muted-foreground">No exams match the selected filters.</div>
          )}
        </div>
      )}
    </div>
  );
}


