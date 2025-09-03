'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Home, Users, GraduationCap, BookOpen, Calendar, BarChart3, Settings, X, Menu, Sun, Moon, Bell, User, LogOut, Shield, CalendarDays } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { useSession, signOut } from 'next-auth/react';

interface CollegeAdminLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: '/dashboard/college-admin', label: 'Dashboard', icon: Home },
  { href: '/dashboard/college-admin/students', label: 'Student Management', icon: Users },
  { href: '/dashboard/college-admin/classes', label: 'Class Management', icon: GraduationCap },
  { href: '/dashboard/college-admin/subjects', label: 'Subject Management', icon: BookOpen },
  { href: '/dashboard/college-admin/exams', label: 'Exam/Test Creation', icon: Calendar },
  { href: '/dashboard/college-admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/college-admin/reports', label: 'Reports & Awards', icon: BarChart3 },
  { href: '/dashboard/college-admin/security', label: 'Security & Monitoring', icon: Shield },
  { href: '/dashboard/college-admin/settings', label: 'College Settings', icon: Settings },
];

function CollegeAdminLayoutContent({ children }: CollegeAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() || '';
  const querySuffix = qs ? `?${qs}` : '';
  const { data: session } = useSession();

  const user = session?.user as any;

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/auth/login' });
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
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
          <Link href={`/dashboard/college-admin${querySuffix}`} className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">Exam SaaS</span>
              <span className="text-xs text-muted-foreground">College Admin</span>
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
                href={`${item.href}${querySuffix}`}
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
              <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || 'admin@example.com'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                college admin
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
                <Link href={`/dashboard/college-admin${querySuffix}`} className="hover:text-foreground">
                  College Admin
                </Link>
                {pathname !== '/dashboard/college-admin' && (
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
                  <DropdownMenuLabel>{user?.name || 'Admin'}</DropdownMenuLabel>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {user?.email || 'admin@example.com'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/college-admin/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
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

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function CollegeAdminLayout({ children }: CollegeAdminLayoutProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollegeAdminLayoutContent>{children}</CollegeAdminLayoutContent>
    </Suspense>
  );
}
