'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Plus, Users, GraduationCap, BookOpen, TrendingUp, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { StudentManagement } from '@/components/user-management/StudentManagement';
import { ClassManagement } from '@/components/user-management/ClassManagement';
import { StudentEnrollment } from '@/components/user-management/StudentEnrollment';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CollegeAdminDashboard() {
  const [activeView, setActiveView] = useState<'dashboard' | 'students' | 'classes' | 'enrollment'>('dashboard');
  
  // Get user data from session/auth context
  const { data: session } = useSession();
  const userData = {
    userRole: session?.user?.role || AppRole.COLLEGE_ADMIN,
    collegeName: "Your College", // TODO: Get from college data using collegeId
    userName: session?.user?.name || "Admin User",
    userEmail: session?.user?.email || "admin@example.com"
  };

  const renderView = () => {
    switch (activeView) {
      case 'students':
        return <StudentManagement />;
      case 'classes':
        return <ClassManagement />;
      case 'enrollment':
        return <StudentEnrollment />;
      default:
        return (
          <>
            {/* Quick Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="mr-2 h-5 w-5 text-blue-600" />
                    Student Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage student enrollments and academic records
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveView('students')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Manage Students
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BookOpen className="mr-2 h-5 w-5 text-purple-600" />
                    Class Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create classes and assign teachers
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveView('classes')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Manage Classes
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <UserPlus className="mr-2 h-5 w-5 text-green-600" />
                    Student Enrollment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enroll students in classes
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveView('enrollment')}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manage Enrollment
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
                    Reports & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    View performance metrics and reports
                  </p>
                  <Button size="sm" className="w-full" variant="outline" asChild>
                    <Link href="/dashboard/college-admin/reports">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Reports
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Student Registrations</CardTitle>
                  <CardDescription>Latest student enrollments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">John Doe</p>
                        <p className="text-sm text-muted-foreground">Computer Science</p>
                      </div>
                      <span className="text-sm text-muted-foreground">Today</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">Jane Smith</p>
                        <p className="text-sm text-muted-foreground">Mathematics</p>
                      </div>
                      <span className="text-sm text-muted-foreground">Yesterday</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Important dates and deadlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">Mid-term Exams</p>
                        <p className="text-sm text-muted-foreground">All departments</p>
                      </div>
                      <span className="text-sm text-muted-foreground">In 5 days</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">Faculty Meeting</p>
                        <p className="text-sm text-muted-foreground">Monthly review</p>
                      </div>
                      <span className="text-sm text-muted-foreground">In 3 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeView === 'dashboard' && 'College Admin Dashboard'}
            {activeView === 'students' && 'Student Management'}
            {activeView === 'classes' && 'Class Management'}
            {activeView === 'enrollment' && 'Student Enrollment'}
          </h1>
          <p className="text-muted-foreground">
            {activeView === 'dashboard' && 'Manage your college operations, students, and academic programs'}
            {activeView === 'students' && 'Manage student accounts, enrollments, and class assignments'}
            {activeView === 'classes' && 'Create and manage classes, assign teachers, and track enrollments'}
            {activeView === 'enrollment' && 'Manage student enrollments in classes and track enrollment status'}
          </p>
        </div>
        {activeView !== 'dashboard' && (
          <Button variant="outline" onClick={() => setActiveView('dashboard')}>
            Back to Dashboard
          </Button>
        )}
      </div>

      {renderView()}
    </div>
  );
}
