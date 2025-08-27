import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Download, RefreshCw, Eye, Key, UserCheck, UserX, Move, Trash2, Search } from 'lucide-react';
import CrossCollegeUserTable from '@/components/tables/cross-college-user-table';

export default function UsersPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cross-College User Management</h1>
          <p className="text-muted-foreground">
            Comprehensive user management across all colleges with global search, bulk operations, and centralized control
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Loading...</div>
            <p className="text-xs text-muted-foreground">
              Across all colleges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Loading...</div>
            <p className="text-xs text-muted-foreground">
              Currently active accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colleges</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Loading...</div>
            <p className="text-xs text-muted-foreground">
              With registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Loading...</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cross-College User Management Table */}
      <CrossCollegeUserTable 
        showSearch={true}
        showPagination={true}
        itemsPerPage={20}
      />

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Cross-College User Management Features</span>
          </CardTitle>
          <CardDescription>
            Comprehensive capabilities for managing users across all institutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Global User Search
              </h4>
              <p className="text-sm text-muted-foreground">
                Search users across all colleges by name, email, roll number, or college name
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Bulk Operations
              </h4>
              <p className="text-sm text-muted-foreground">
                Mass password resets, role changes, account activations, and college transfers
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                User Impersonation
              </h4>
              <p className="text-sm text-muted-foreground">
                Super admins can access any user account for troubleshooting and support
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Data Export
              </h4>
              <p className="text-sm text-muted-foreground">
                Export user data in CSV format for compliance and auditing purposes
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Move className="h-4 w-4 mr-2" />
                Cross-College Transfers
              </h4>
              <p className="text-sm text-muted-foreground">
                Move users between colleges and subscription tiers seamlessly
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Real-time Monitoring
              </h4>
              <p className="text-sm text-muted-foreground">
                Live user activity monitoring and suspicious behavior detection
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
