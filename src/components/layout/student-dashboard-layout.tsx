'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Home,
  FileText,
  BarChart3,
  Calendar,
  Award,
  Settings,
  GraduationCap,
  Menu,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  X
} from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import dynamic from 'next/dynamic';
const NotificationCenter = dynamic(() => import('@/components/student/NotificationCenter'), { ssr: false });
const GlobalSearch = dynamic(() => import('@/components/student/GlobalSearch'), { ssr: false });
const HelpCenter = dynamic(() => import('@/components/student/HelpCenter'), { ssr: false });

interface StudentDashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: '/dashboard/student', label: 'Overview', icon: Home },
  { href: '/dashboard/student/exams', label: 'Exams', icon: FileText },
  { href: '/dashboard/student/history', label: 'History', icon: BarChart3 },
  { href: '/dashboard/student/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/student/awards', label: 'Awards', icon: Award },
  { href: '/dashboard/student/settings', label: 'Settings', icon: Settings },
];

export function StudentDashboardLayout({ children }: StudentDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState<number>(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    // Integrate with auth flow later
    console.log('Logout clicked');
  };

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const res = await fetch('/api/notifications?limit=1', { cache: 'no-store' });
        const data = await res.json();
        setUnread(data.unreadCount || 0);
      } catch {}
    };
    loadUnread();
    const id = setInterval(loadUnread, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Student navigation"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard/student" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Exam SaaS</span>
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

        <nav className="flex-1 px-4 py-6 space-y-2" role="navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
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
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <nav className="flex items-center space-x-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
                <Link href="/dashboard/student" className="hover:text-foreground">
                  Dashboard
                </Link>
                {pathname !== '/dashboard/student' && (
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
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Open search" onClick={() => setSearchOpen(true)}>
                /
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Help" onClick={() => setHelpOpen(true)}>
                ?
              </Button>

              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative" aria-label="Notifications" onClick={() => setNotifOpen(true)}>
                <Bell className="h-4 w-4" />
                {unread > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" aria-label="New notifications" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0" aria-label="Open profile menu">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Student</DropdownMenuLabel>
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

        <main className="flex-1">
          {children}
        </main>
        <NotificationCenter open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (!o) { /* refresh unread next tick */ setTimeout(async () => { try { const res = await fetch('/api/notifications?limit=1', { cache: 'no-store' }); const data = await res.json(); setUnread(data.unreadCount || 0); } catch {} }, 300); } }} />
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <HelpCenter open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </div>
  );
}

export default StudentDashboardLayout;


