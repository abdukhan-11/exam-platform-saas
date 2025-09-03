'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Building2, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  X, 
  GraduationCap,
  Menu,
  Sun,
  Moon,
  Bell,
  Shield,
  Activity,
  CheckCircle,
  User,
  LogOut,
  Mail
} from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { signOut } from 'next-auth/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: '/dashboard/superadmin', label: 'Dashboard', icon: Home },
  { href: '/dashboard/superadmin/colleges', label: 'Colleges', icon: Building2 },
  { href: '/dashboard/superadmin/users', label: 'Users', icon: Users },
  { href: '/dashboard/superadmin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/dashboard/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/superadmin/platform-health', label: 'Platform Health', icon: Activity },
  { href: '/dashboard/superadmin/system-performance', label: 'System Performance', icon: Activity },
  { href: '/dashboard/superadmin/platform-config', label: 'Platform Config', icon: Settings },
  { href: '/dashboard/superadmin/security', label: 'Security', icon: Shield },
  { href: '/dashboard/superadmin/email-management', label: 'Email Management', icon: Mail },
  { href: '/dashboard/superadmin/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/superadmin/quality-control', label: 'Quality Control', icon: CheckCircle },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

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
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-label="Super Admin navigation">
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard/superadmin" className="flex items-center space-x-2">
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

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" role="navigation" aria-label="Super Admin navigation">
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
              <p className="text-sm font-medium truncate">Super Admin</p>
              <p className="text-xs text-muted-foreground truncate">admin@exam-saas.com</p>
              <p className="text-xs text-muted-foreground capitalize">
                super admin
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
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
              
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Link href="/dashboard/superadmin" className="hover:text-foreground">
                  Dashboard
                </Link>
                {pathname !== '/dashboard/superadmin' && (
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
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative" aria-label="View notifications">
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" aria-label="New notifications available"></span>
              </Button>

              {/* User profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0" aria-label="Open profile menu">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Super Admin</DropdownMenuLabel>
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

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
