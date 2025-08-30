'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type ResultItem = {
  id: string;
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  date: string | Date;
  score: number;
  totalMarks: number;
  percentage: number;
};

type SubjectAnalytics = {
  subjectId: string;
  subjectName: string;
  correct: number;
  incorrect: number;
  accuracy: number; // 0..1
};

export function PerformanceCharts({ results, subjectAnalytics }: { results: ResultItem[]; subjectAnalytics: SubjectAnalytics[] }) {
  const [renderMs, setRenderMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    const t0 = performance.now();
    const id = requestAnimationFrame(() => {
      const t1 = performance.now();
      setRenderMs(Math.max(0, t1 - t0));
    });
    return () => cancelAnimationFrame(id);
  }, [results, subjectAnalytics]);
  const sortedByDate = useMemo(() => {
    return [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [results]);

  const trendData = useMemo(() => {
    return sortedByDate.map((r) => ({
      date: new Date(r.date).toLocaleDateString(),
      percentage: Number(r.percentage.toFixed(2)),
    }));
  }, [sortedByDate]);

  const subjectBarData = useMemo(() => {
    // Average by subject
    const bySub = new Map<string, { name: string; sum: number; count: number }>();
    for (const r of results) {
      const prev = bySub.get(r.subjectId) ?? { name: r.subjectName, sum: 0, count: 0 };
      prev.sum += r.percentage;
      prev.count += 1;
      bySub.set(r.subjectId, prev);
    }
    return Array.from(bySub.values()).map((v) => ({ subject: v.name, average: v.count ? Number((v.sum / v.count).toFixed(2)) : 0 }));
  }, [results]);

  const completionPieData = useMemo(() => {
    const completed = results.filter((r) => r.percentage >= 0).length;
    const total = results.length;
    const incomplete = Math.max(0, total - completed);
    return [
      { name: 'Completed', value: completed },
      { name: 'Remaining', value: incomplete },
    ];
  }, [results]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {renderMs != null && (
        <div className="col-span-1 lg:col-span-3 text-[10px] text-muted-foreground">Charts rendered in ~{renderMs.toFixed(0)}ms</div>
      )}
      <div className="col-span-1 lg:col-span-2">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="percentage" name="Percentage" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-1">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={completionPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                {completionPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-1 lg:col-span-3">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectBarData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Legend />
              <Bar dataKey="average" name="Avg %" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default PerformanceCharts;


