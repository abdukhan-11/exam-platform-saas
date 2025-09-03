'use client';

import React from 'react';
import LiveExamMonitor from '@/components/admin/LiveExamMonitor';

export default function ExamMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const examId = resolvedParams.id as string;

  return (
    <div className="container mx-auto p-6">
      <LiveExamMonitor examId={examId} refreshInterval={5000} />
    </div>
  );
}