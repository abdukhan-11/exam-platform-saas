'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CollegeDashboardLayout } from '@/components/layout/college-dashboard-layout';
import { AppRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { FileText, GraduationCap, BarChart3, Calendar, Clock, Users } from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboard() {
  // TODO: Get from session/auth context
  const mockUserData = {
    userRole: AppRole.TEACHER,
    collegeName: "Sample College",
    userName: "Teacher Name",
    userEmail: "teacher@example.com"
  };

  return (
    <CollegeDashboardLayout {...mockUserData}>
      <div className="space-y-6">
        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <GraduationCap className="mr-2 h-5 w-5 text-blue-600" />
                My Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                View and manage your assigned classes
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/dashboard/my-classes">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  View Classes
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5 text-green-600" />
                Exam Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Create and manage exams
              </p>
              <Button asChild size="sm" className="w-full" variant="outline">
                <Link href="/dashboard/exam-management">
                  <FileText className="mr-2 h-4 w-4" />
                  Manage Exams
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-purple-600" />
                Student Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Monitor student performance
              </p>
              <Button asChild size="sm" className="w-full" variant="outline">
                <Link href="/dashboard/student-progress">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Progress
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-orange-600" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                View your teaching schedule
              </p>
              <Button asChild size="sm" className="w-full" variant="outline">
                <Link href="/dashboard/calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Schedule
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule and Quick Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Today&apos;s Schedule
              </CardTitle>
              <CardDescription>Your classes for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">Mathematics - Grade 10A</p>
                    <p className="text-sm text-muted-foreground">Room 201</p>
                  </div>
                  <span className="text-sm text-muted-foreground">09:00 AM</span>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">Physics - Grade 11B</p>
                    <p className="text-sm text-muted-foreground">Lab 301</p>
                  </div>
                  <span className="text-sm text-muted-foreground">11:00 AM</span>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">Mathematics - Grade 10B</p>
                    <p className="text-sm text-muted-foreground">Room 201</p>
                  </div>
                  <span className="text-sm text-muted-foreground">02:00 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Recent Student Activity
              </CardTitle>
              <CardDescription>Latest submissions and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">Assignment submitted</p>
                    <p className="text-sm text-muted-foreground">John Doe - Math Homework</p>
                  </div>
                  <span className="text-sm text-muted-foreground">2 hrs ago</span>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">Exam completed</p>
                    <p className="text-sm text-muted-foreground">Jane Smith - Physics Quiz</p>
                  </div>
                  <span className="text-sm text-muted-foreground">5 hrs ago</span>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">Assignment submitted</p>
                    <p className="text-sm text-muted-foreground">Mike Johnson - Lab Report</p>
                  </div>
                  <span className="text-sm text-muted-foreground">1 day ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CollegeDashboardLayout>
  );
}
