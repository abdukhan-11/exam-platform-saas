'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { RefreshCw, Eye, Copy, Upload, Download, Trash2 } from 'lucide-react';

type Exam = {
  id: string;
  title: string;
  description?: string | null;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isPublished: boolean;
  subjectId: string;
  classId?: string | null;
};

function computeStatus(exam: Exam): 'draft' | 'scheduled' | 'active' | 'completed' {
  if (!exam.isPublished) return 'draft';
  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'active';
  return 'completed';
}

export default function ExamManagementPage() {
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) =>
      e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q)
    );
  }, [items, search]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/exams');
      const data = await res.json();
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function duplicateExam(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/exams/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate');
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  }

  async function togglePublish(id: string, isPublished: boolean) {
    setActionId(id);
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      if (!res.ok) throw new Error('Failed to toggle publish');
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  }

  async function deleteExam(id: string) {
    if (!confirm('Delete this exam?')) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl">Exam Management</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search exams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button onClick={refresh} disabled={loading} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((exam) => {
                    const status = computeStatus(exam);
                    return (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>
                          {status === 'draft' && <Badge variant="secondary">Draft</Badge>}
                          {status === 'scheduled' && <Badge>Scheduled</Badge>}
                          {status === 'active' && <Badge variant="destructive">Active</Badge>}
                          {status === 'completed' && <Badge variant="outline">Completed</Badge>}
                        </TableCell>
                        <TableCell>{new Date(exam.startTime).toLocaleString()}</TableCell>
                        <TableCell>{new Date(exam.endTime).toLocaleString()}</TableCell>
                        <TableCell>{exam.totalMarks}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/exam-management/${exam.id}/preview`}>
                                <Eye className="mr-2 h-4 w-4" /> Preview
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" disabled={actionId === exam.id} onClick={() => duplicateExam(exam.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant={exam.isPublished ? 'outline' : 'default'}
                              disabled={actionId === exam.id}
                              onClick={() => togglePublish(exam.id, exam.isPublished)}
                            >
                              {exam.isPublished ? (
                                <Download className="mr-2 h-4 w-4" />
                              ) : (
                                <Upload className="mr-2 h-4 w-4" />
                              )}
                              {exam.isPublished ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={actionId === exam.id} onClick={() => deleteExam(exam.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


