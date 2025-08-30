'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type Subject = { id: string; name: string; code?: string | null };

type ViewMode = 'month' | 'week' | 'day';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDate(dt: Date) {
  return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function StudentCalendarPage() {
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [examsRes, subjRes] = await Promise.all([
          fetch('/api/exams', { cache: 'no-store' }),
          fetch('/api/subjects', { cache: 'no-store' }),
        ]);
        const examsJson = await examsRes.json();
        setExams(examsJson?.items ?? []);
        const subjJson = await subjRes.json();
        setSubjects(subjJson?.items ?? []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load calendar data', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const visibleRange = useMemo(() => {
    if (view === 'day') {
      const s = new Date(cursor);
      s.setHours(0, 0, 0, 0);
      const e = new Date(cursor);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    if (view === 'week') {
      return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    }
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }, [view, cursor]);

  const filtered = useMemo(() => {
    return (exams ?? []).filter((e) => (subjectFilter === 'all' ? true : e.subjectId === subjectFilter));
  }, [exams, subjectFilter]);

  const eventsInRange = useMemo(() => {
    const s = visibleRange.start.getTime();
    const e = visibleRange.end.getTime();
    return filtered.filter((x) => {
      const xs = new Date(x.startTime).getTime();
      const xe = new Date(x.endTime).getTime();
      return xe >= s && xs <= e;
    });
  }, [filtered, visibleRange]);

  const daysForMonth = useMemo(() => {
    if (view !== 'month') return [] as Date[];
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [view, cursor]);

  const weekDays = useMemo(() => {
    if (view !== 'week') return [] as Date[];
    const s = startOfWeek(cursor);
    return Array.from({ length: 7 }).map((_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
  }, [view, cursor]);

  const dayEvents = useMemo(() => {
    if (view !== 'day') return [] as Exam[];
    return eventsInRange.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [view, eventsInRange]);

  const title = useMemo(() => {
    return cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }, [cursor]);

  const prev = () => {
    const d = new Date(cursor);
    if (view === 'day') d.setDate(d.getDate() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCursor(d);
  };

  const next = () => {
    const d = new Date(cursor);
    if (view === 'day') d.setDate(d.getDate() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCursor(d);
  };

  const onAddReminder = (exam: Exam) => {
    try {
      const start = new Date(exam.startTime);
      const subject = subjectMap.get(exam.subjectId)?.name ?? exam.subjectId;
      const blob = new Blob([
        [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Exam SaaS//Student Calendar//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:${exam.id}@exam-saas`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `SUMMARY:${exam.title} (${subject})`,
          `DESCRIPTION:${(exam.description ?? '').replace(/\n/g, ' ')}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\n')
      ], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-${exam.id}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to add reminder', e);
    }
  };

  const renderEventPill = (exam: Exam) => {
    const subject = subjectMap.get(exam.subjectId);
    return (
      <button
        key={exam.id}
        onClick={() => setSelectedExam(exam)}
        className="block w-full truncate rounded px-2 py-1 text-xs text-left bg-primary/10 hover:bg-primary/20"
        title={exam.title}
      >
        <span className="font-medium">{exam.title}</span>
        <span className="opacity-70">{subject ? ` • ${subject.name}` : ''}</span>
      </button>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">View upcoming exams by month, week, or day.</p>
        </div>
        <div className="flex gap-2">
          <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="View" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={prev}>Prev</Button>
            <Button variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="outline" onClick={next}>Next</Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading calendar…</div>
          ) : (
            <>
              {view === 'month' && (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 gap-2 text-sm min-w-[840px]">
                    {daysForMonth.map((day) => (
                      <div key={day.toISOString()} className="min-h-[110px] border rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${sameDay(day, new Date()) ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{day.getDate()}</span>
                      </div>
                      <div className="space-y-1">
                        {eventsInRange
                          .filter((ev) => sameDay(new Date(ev.startTime), day))
                          .slice(0, 3)
                          .map((ev) => renderEventPill(ev))}
                        {eventsInRange.filter((ev) => sameDay(new Date(ev.startTime), day)).length > 3 && (
                          <div className="text-xs text-muted-foreground">+ more</div>
                        )}
                      </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'week' && (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 gap-2 text-sm min-w-[840px]">
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="min-h-[140px] border rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${sameDay(day, new Date()) ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="space-y-1">
                        {eventsInRange
                          .filter((ev) => sameDay(new Date(ev.startTime), day))
                          .map((ev) => renderEventPill(ev))}
                      </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'day' && (
                <div className="space-y-2">
                  {dayEvents.length === 0 && (
                    <div className="text-sm text-muted-foreground">No exams on this day.</div>
                  )}
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="border rounded p-2">
                      {renderEventPill(ev)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedExam} onOpenChange={(o) => !o && setSelectedExam(null)}>
        <DialogContent>
          {selectedExam && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{selectedExam.title}</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground">
                <div><span className="font-medium text-foreground">Starts:</span> {formatDate(new Date(selectedExam.startTime as any))}</div>
                <div><span className="font-medium text-foreground">Ends:</span> {formatDate(new Date(selectedExam.endTime as any))}</div>
                <div>
                  <span className="font-medium text-foreground">Subject:</span> {subjectMap.get(selectedExam.subjectId)?.name ?? selectedExam.subjectId}
                </div>
                {selectedExam.description && (
                  <div className="mt-2 whitespace-pre-wrap">{selectedExam.description}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onAddReminder(selectedExam)}>Add Reminder</Button>
                <Button variant="outline" onClick={() => setSelectedExam(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


