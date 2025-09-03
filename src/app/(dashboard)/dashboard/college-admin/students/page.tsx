'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  UserPlus,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  LogIn,
  Edit,
  Eye,
  BookOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StudentManagement } from '@/components/user-management/StudentManagement';

interface Student {
  id: string;
  rollNo: string;
  name: string;
  fatherName: string;
  email?: string;
  phone?: string;
  class: string;
  status: 'active' | 'inactive' | 'suspended';
  password: string;
  joinDate: string;
  profilePic?: string;
  subjects: string[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('Class 1st');
  const router = useRouter();

  // Mock data organized by classes - in a real app, this would come from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockStudents: Student[] = [
        // Class 1st Students
        {
          id: '1',
          rollNo: '001',
          name: 'Ahmad Ali',
          fatherName: 'Mohammad Ali',
          email: 'ahmad.ali@example.com',
          phone: '+92 300 1234567',
          class: 'Class 1st',
          status: 'active',
          password: 'student123',
          joinDate: '2024-01-15',
          subjects: ['Math', 'Physics', 'Urdu', 'English']
        },
        {
          id: '2',
          rollNo: '002',
          name: 'Fatima Khan',
          fatherName: 'Hassan Khan',
          email: 'fatima.khan@example.com',
          phone: '+92 300 2345678',
          class: 'Class 1st',
          status: 'active',
          password: 'student123',
          joinDate: '2024-01-15',
          subjects: ['Math', 'Physics', 'Urdu', 'English']
        },
        {
          id: '3',
          rollNo: '003',
          name: 'Muhammad Hassan',
          fatherName: 'Abdul Rahman',
          class: 'Class 1st',
          status: 'active',
          password: 'student123',
          joinDate: '2024-01-15',
          subjects: ['Math', 'Physics', 'Urdu', 'English']
        },
        // Class 2nd Students
        {
          id: '4',
          rollNo: '001',
          name: 'Ayesha Malik',
          fatherName: 'Tariq Malik',
          email: 'ayesha.malik@example.com',
          phone: '+92 300 3456789',
          class: 'Class 2nd',
          status: 'active',
          password: 'student123',
          joinDate: '2023-01-15',
          subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'Urdu']
        },
        {
          id: '5',
          rollNo: '002',
          name: 'Omar Sheikh',
          fatherName: 'Ahmed Sheikh',
          class: 'Class 2nd',
          status: 'active',
          password: 'student123',
          joinDate: '2023-01-15',
          subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'Urdu']
        },
        // Class 3rd Students
        {
          id: '6',
          rollNo: '001',
          name: 'Zainab Ahmed',
          fatherName: 'Rashid Ahmed',
          email: 'zainab.ahmed@example.com',
          class: 'Class 3rd',
          status: 'active',
          password: 'student123',
          joinDate: '2022-01-15',
          subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'Urdu', 'English']
        }
      ];
      setStudents(mockStudents);
      setLoading(false);
    }, 1000);
  }, []);

  // Handle login as student
  const handleLoginAsStudent = async (student: Student) => {
    try {
      // In a real app, this would make an API call to create a temporary session
      // For demo purposes, we'll redirect to student dashboard with student data
      localStorage.setItem('impersonatingStudent', JSON.stringify({
        rollNo: student.rollNo,
        name: student.name,
        class: student.class,
        isImpersonating: true,
        adminSession: true
      }));
      
      // Redirect to student dashboard
      router.push('/dashboard/student');
    } catch (error) {
      console.error('Failed to login as student:', error);
    }
  };

  // Get available classes
  const availableClasses = [...new Set(students.map(student => student.class))].sort();
  
  // Filter students by selected class
  const classStudents = students.filter(student => student.class === selectedClass);
  
  const filteredStudents = classStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.fatherName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'graduated': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalStudents = classStudents.length;
  const activeStudents = classStudents.filter(s => s.status === 'active').length;
  const inactiveStudents = classStudents.filter(s => s.status === 'inactive').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Students</h1>
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

  return <StudentManagement />;
}
