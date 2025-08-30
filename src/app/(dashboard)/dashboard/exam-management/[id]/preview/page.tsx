'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Exam = {
  id: string;
  title: string;
  description?: string | null;
  duration: number;
  totalMarks: number;
  startTime: string;
  endTime: string;
};

type Question = {
  id: string;
  text: string;
  type: string;
  options?: string | null;
  marks: number;
  explanation?: string | null;
};

export default function ExamPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [eRes, qRes] = await Promise.all([
          fetch(`/api/exams/${id}`),
          fetch(`/api/exams/${id}/questions`),
        ]);
        if (eRes.ok) setExam(await eRes.json());
        if (qRes.ok) {
          const q = await qRes.json();
          setQuestions(Array.isArray(q.items) ? q.items : []);
        }
      } catch (e) {
        console.error('Failed to load preview', e);
      }
    }
    if (id) load();
  }, [id]);

  return (
    <div className="space-y-6">
      {exam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span>{exam.title}</span>
              <Badge variant="outline">{exam.totalMarks} marks</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exam.description && (
              <p className="mb-4 text-muted-foreground">{exam.description}</p>
            )}
            <div className="grid gap-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="border rounded p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">Q{idx + 1}. {q.text}</h3>
                    <Badge>{q.marks} marks</Badge>
                  </div>
                  {q.options && (
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      {(() => {
                        try {
                          const opts: Array<{ text: string; isCorrect?: boolean }> = JSON.parse(q.options);
                          return opts.map((o, i) => <li key={i}>{o.text}</li>);
                        } catch {
                          return null;
                        }
                      })()}
                    </ul>
                  )}
                  {q.explanation && (
                    <p className="text-sm text-muted-foreground mt-2">Explanation: {q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


