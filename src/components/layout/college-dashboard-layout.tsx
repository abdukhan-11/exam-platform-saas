'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Home, Users, GraduationCap, BookOpen, Calendar, BarChart3, Settings, X, Menu, Sun, Moon, Bell, User, LogOut, Mail, Plus, FileText, Clock, CheckCircle } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { AppRole } from '@/types/auth';
import DashboardErrorBoundary, { DashboardComponentErrorBoundary } from '@/components/shared/dashboard-error-boundary';

interface DashboardMetrics {
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  upcomingExams: number;
}

interface CollegeDashboardLayoutProps {
  children: React.ReactNode;
  userRole: AppRole;
  collegeName: string;
  userName: string;
  userEmail: string;
}

const getNavigationItems = (role: AppRole) => {
  const baseItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/classes', label: 'Classes', icon: GraduationCap },
    { href: '/dashboard/subjects', label: 'Subjects', icon: BookOpen },
    { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  if (role === AppRole.COLLEGE_ADMIN) {
    return [
      ...baseItems,
      { href: '/dashboard/teachers', label: 'Teachers', icon: Users },
      { href: '/dashboard/students', label: 'Students', icon: Users },
      { href: '/dashboard/enrollments', label: 'Enrollments', icon: CheckCircle },
    ];
  }

  // Teacher role removed; college admins see full navigation above

  return baseItems;
};

const getQuickActions = (role: AppRole) => {
  if (role === AppRole.COLLEGE_ADMIN) {
    return [
      { label: 'Add Student', href: '/dashboard/students/new', icon: Plus },
      { label: 'Create Class', href: '/dashboard/classes/new', icon: Plus },
      { label: 'Invite Teacher', href: '/dashboard/teachers/invite', icon: Mail },
      { label: 'View Reports', href: '/dashboard/reports', icon: BarChart3 },
    ];
  }

  // Teacher role removed; teacher features accessible to college admin

  return [];
};


export function CollegeDashboardLayout({ children, userRole, collegeName, userName, userEmail }: CollegeDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    totalClasses: 0,
    totalSubjects: 0,
    upcomingExams: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const navigationItems = getNavigationItems(userRole);
  const quickActions = getQuickActions(userRole);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  useEffect(() => {
    const loadMetrics = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (userRole === AppRole.COLLEGE_ADMIN) {
        setMetrics({
          totalStudents: 1250,
          totalClasses: 45,
          totalSubjects: 28,
          upcomingExams: 12,
        });
      }
      
      setIsLoading(false);
    };

    loadMetrics();
  }, [userRole]);

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-background">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSidebarOpen(false);
              }
            }}
            aria-label="Close sidebar"
          />
        )}

        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          aria-label="Main navigation"
        >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">Exam SaaS</span>
              <span className="text-xs text-muted-foreground">{collegeName}</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" role="navigation" aria-label="Dashboard navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {userRole.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>
        </div>
        </aside>

        <div className="lg:pl-64">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
                {pathname !== '/dashboard' && (
                  <>
                    <span>/</span>
                    <span className="text-foreground">
                      {navigationItems.find(item => item.href === pathname)?.label || 'Page'}
                    </span>
                  </>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 relative"
                aria-label="View notifications"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" aria-label="New notifications available"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {userEmail}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground">
                  Welcome back, {userName}. Here&apos;s what&apos;s happening at {collegeName}.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {quickActions.map((action) => (
                  <Button key={action.href} asChild size="sm">
                    <Link href={action.href}>
                      <action.icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            <DashboardComponentErrorBoundary componentName="Dashboard Overview Cards">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Dashboard metrics overview">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" aria-label="Loading student count" />
                    ) : (
                      <div className="text-2xl font-bold" aria-label={`${metrics.totalStudents} students`}>
                        {metrics.totalStudents.toLocaleString()}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {userRole === AppRole.COLLEGE_ADMIN ? 'Enrolled students' : 'Students in my classes'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                    <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" aria-label="Loading class count" />
                    ) : (
                      <div className="text-2xl font-bold" aria-label={`${metrics.totalClasses} classes`}>
                        {metrics.totalClasses}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {userRole === AppRole.COLLEGE_ADMIN ? 'Active classes' : 'My assigned classes'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" aria-label="Loading subject count" />
                    ) : (
                      <div className="text-2xl font-bold" aria-label={`${metrics.totalSubjects} subjects`}>
                        {metrics.totalSubjects}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {userRole === AppRole.COLLEGE_ADMIN ? 'Available subjects' : 'Subjects I teach'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" aria-label="Loading exam count" />
                    ) : (
                      <div className="text-2xl font-bold" aria-label={`${metrics.upcomingExams} upcoming exams`}>
                        {metrics.upcomingExams}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {userRole === AppRole.COLLEGE_ADMIN ? 'Scheduled exams' : 'My upcoming exams'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </DashboardComponentErrorBoundary>
          </div>

          <DashboardComponentErrorBoundary componentName="Dashboard Content">
            {children}
          </DashboardComponentErrorBoundary>
        </main>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
