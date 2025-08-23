import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Monitor system-wide statistics and health</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View system performance, user counts, and overall platform health metrics.
            </p>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader>
            <CardTitle>College Management</CardTitle>
            <CardDescription>Manage colleges and institutions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add, edit, and manage colleges, their settings, and administrative access.
            </p>
            <Button asChild>
              <Link href="/dashboard/superadmin/colleges">Manage Colleges</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage all users across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View, edit, and manage user accounts, roles, and permissions system-wide.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
