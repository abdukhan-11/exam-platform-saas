'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SecureExamInterface from '@/components/student/SecureExamInterface';

export default function StudentExamPage() {
  const params = useParams<{ id: string }>();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!examId) return null;

  return <SecureExamInterface examId={examId} />;
}


