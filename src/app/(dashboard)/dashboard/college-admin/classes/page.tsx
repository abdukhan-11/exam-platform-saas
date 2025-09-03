'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Plus, 
  Users, 
  BookOpen, 
  Calendar,
  TrendingUp,
  Edit,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { ClassManagement } from '@/components/user-management/ClassManagement';

interface ClassInfo {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  subjects: string[];
  startDate: string;
  status: 'active' | 'inactive';
  nextExam?: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - in real app, this would come from API
    setTimeout(() => {
      const mockClasses: ClassInfo[] = [
        {
          id: '1',
          name: 'Class 1st',
          description: 'First year students - Foundation level',
          studentCount: 3,
          subjects: ['Math', 'Physics', 'Urdu', 'English'],
          startDate: '2024-01-15',
          status: 'active',
          nextExam: 'Math Test - Tomorrow'
        },
        {
          id: '2',
          name: 'Class 2nd',
          description: 'Second year students - Intermediate level',
          studentCount: 2,
          subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'Urdu'],
          startDate: '2023-01-15',
          status: 'active',
          nextExam: 'Chemistry Lab Test - Friday'
        },
        {
          id: '3',
          name: 'Class 3rd',
          description: 'Third year students - Advanced level',
          studentCount: 1,
          subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'Urdu', 'English'],
          startDate: '2022-01-15',
          status: 'active'
        }
      ];
      setClasses(mockClasses);
      setLoading(false);
    }, 1000);
  }, []);

  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
  const activeClasses = classes.filter(cls => cls.status === 'active').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Classes</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return <ClassManagement />;
}
