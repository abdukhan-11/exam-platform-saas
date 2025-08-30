'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useSearchPreferences from '@/hooks/useSearchPreferences';

type ExamItem = { id: string; title: string; subjectName?: string; subjectId?: string };
type HistoryItem = { id: string; examTitle: string; subjectName: string };

export default function GlobalSearch({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data?: { exams?: ExamItem[]; history?: HistoryItem[] } }) {
  const [q, setQ] = useState('');
  const { recent, addRecent, clearRecent } = useSearchPreferences();

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as Array<{ key: string; type: 'exam' | 'history'; title: string; subtitle?: string; href: string }>;
    const out: Array<{ key: string; type: 'exam' | 'history'; title: string; subtitle?: string; href: string }> = [];
    if (data?.exams) {
      for (const e of data.exams) {
        const hay = `${e.title} ${e.subjectName ?? e.subjectId ?? ''}`.toLowerCase();
        if (hay.includes(term)) out.push({ key: `exam-${e.id}`, type: 'exam', title: e.title, subtitle: e.subjectName, href: `/dashboard/student/exams/${e.id}/details` });
      }
    }
    if (data?.history) {
      for (const h of data.history) {
        const hay = `${h.examTitle} ${h.subjectName}`.toLowerCase();
        if (hay.includes(term)) out.push({ key: `hist-${h.id}`, type: 'history', title: h.examTitle, subtitle: h.subjectName, href: `/dashboard/student/history` });
      }
    }
    return out.slice(0, 20);
  }, [q, data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) addRecent(q.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search Exams & Results</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex items-center gap-2 mb-3">
          <Input placeholder="Search by title, subject…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <Button type="submit" variant="secondary">Save</Button>
        </form>
        {!q && (
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">Recent searches</div>
            <div className="flex flex-wrap gap-2">
              {recent.length ? recent.map((r) => (
                <button key={r} className="text-xs px-2 py-1 border rounded hover:bg-muted" onClick={() => setQ(r)}>{r}</button>
              )) : <div className="text-xs text-muted-foreground">No recent</div>}
              {recent.length > 0 && <Button size="sm" variant="ghost" onClick={clearRecent}>Clear</Button>}
            </div>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto space-y-1">
          {q && results.length === 0 && <div className="text-sm text-muted-foreground">No results</div>}
          {results.map((r) => (
            <a key={r.key} href={r.href} className="block border rounded p-2 hover:bg-muted">
              <div className="text-sm font-medium">{r.title}</div>
              {r.subtitle && <div className="text-xs text-muted-foreground">{r.subtitle}</div>}
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{r.type}</div>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}


