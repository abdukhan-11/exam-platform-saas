'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Ban, 
  CheckCircle,
  Building2,
  Users,
  Eye,
  Key,
  UserCheck,
  UserX,
  Move,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  rollNo: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  college: {
    id: string;
    name: string;
    subscriptionStatus: string;
    isActive: boolean;
  } | null;
}

interface College {
  id: string;
  name: string;
  subscriptionStatus: string;
  isActive: boolean;
}

interface UserStats {
  role: string;
  count: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CrossCollegeUserTableProps {
  showSearch?: boolean;
  showPagination?: boolean;
  itemsPerPage?: number;
}

const roleColors = {
  SUPER_ADMIN: 'bg-red-100 text-red-800',
  COLLEGE_ADMIN: 'bg-blue-100 text-blue-800',
  TEACHER: 'bg-green-100 text-green-800',
  STUDENT: 'bg-gray-100 text-gray-800'
};

const roleLabels = {
  SUPER_ADMIN: 'Super Admin',
  COLLEGE_ADMIN: 'College Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student'
};

const subscriptionColors = {
  TRIAL: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800'
};

export default function CrossCollegeUserTable({ 
  showSearch = true, 
  showPagination = true, 
  itemsPerPage = 20 
}: CrossCollegeUserTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: itemsPerPage,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterCollege, setFilterCollege] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    action: string;
    isLoading: boolean;
    data?: any;
  }>({
    open: false,
    action: '',
    isLoading: false
  });

  // Fetch users data
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterCollege !== 'all') params.append('collegeId', filterCollege);
      if (filterStatus !== 'all') params.append('isActive', filterStatus);

      const response = await fetch(`/api/admin/cross-college-users?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setColleges(data.colleges);
      setUserStats(data.userStats);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, filterRole, filterCollege, filterStatus]);

  // Handle bulk operations
  const handleBulkOperation = async (action: string, data?: any) => {
    if (selectedUsers.size === 0) {
      setError('Please select users to perform this operation');
      return;
    }

    setBulkActionDialog({
      open: true,
      action,
      isLoading: false,
      data
    });
  };

  const executeBulkOperation = async () => {
    const { action, data } = bulkActionDialog;
    setBulkActionDialog(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/admin/cross-college-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: Array.from(selectedUsers),
          data
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute bulk operation');
      }

      const result = await response.json();
      
      // Refresh users list
      await fetchUsers();
      
      // Clear selection
      setSelectedUsers(new Set());
      
      // Show success message
      setError(null);
      alert(result.message);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute bulk operation');
    } finally {
      setBulkActionDialog(prev => ({ ...prev, isLoading: false, open: false }));
    }
  };

  // Handle user impersonation
  const handleUserImpersonation = (userId: string) => {
    // This would typically redirect to a special impersonation route
    // For now, we'll just show an alert
    alert(`Impersonating user ${userId} - This feature will be implemented in future tasks`);
  };

  // Handle export
  const handleExport = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-college-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'College', 'Status', 'Created At'];
    const rows = users.map(user => [
      user.name,
      user.email,
      user.role,
      user.college?.name || 'No College',
      user.isActive ? 'Active' : 'Inactive',
      new Date(user.createdAt).toLocaleDateString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(pagination.totalPages);
  const goToPreviousPage = () => goToPage(Math.max(1, pagination.page - 1));
  const goToNextPage = () => goToPage(Math.min(pagination.totalPages, pagination.page + 1));

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(user => user.id)));
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search & Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search users, emails, or colleges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role-filter">Role</Label>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {userStats.map(stat => (
                      <SelectItem key={stat.role} value={stat.role}>
                        {roleLabels[stat.role as keyof typeof roleLabels]} ({stat.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="college-filter">College</Label>
                <Select value={filterCollege} onValueChange={setFilterCollege}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Colleges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colleges</SelectItem>
                    {colleges.map(college => (
                      <SelectItem key={college.id} value={college.id}>
                        {college.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Bulk Actions ({selectedUsers.size} users selected)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('bulk-password-reset')}
              >
                <Key className="h-4 w-4 mr-2" />
                Reset Passwords
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('bulk-activate')}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('bulk-deactivate')}
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('bulk-delete')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('bulk-college-transfer', { collegeId: '' })}
              >
                <Move className="h-4 w-4 mr-2" />
                Transfer College
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Cross-College Users</span>
              </CardTitle>
              <CardDescription>
                Manage users across all colleges from a single interface
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={toggleAllUsers}
                        />
                      </th>
                      <th className="p-3 text-left font-medium">User</th>
                      <th className="p-3 text-left font-medium">Role</th>
                      <th className="p-3 text-left font-medium">College</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-left font-medium">Created</th>
                      <th className="p-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t hover:bg-muted/25">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            {user.rollNo && (
                              <div className="text-xs text-muted-foreground">Roll: {user.rollNo}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                            {roleLabels[user.role as keyof typeof roleLabels]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {user.college ? (
                            <div>
                              <div className="font-medium">{user.college.name}</div>
                              <Badge 
                                variant="outline" 
                                className={subscriptionColors[user.college.subscriptionStatus as keyof typeof subscriptionColors]}
                              >
                                {user.college.subscriptionStatus}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No College</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleUserImpersonation(user.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Impersonate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBulkOperation('bulk-password-reset', { userIds: [user.id] })}>
                                <Key className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleBulkOperation('bulk-activate', { userIds: [user.id] })}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBulkOperation('bulk-deactivate', { userIds: [user.id] })}>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleBulkOperation('bulk-delete', { userIds: [user.id] })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {showPagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToFirstPage}
                      disabled={pagination.page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToLastPage}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        open={bulkActionDialog.open}
        onOpenChange={(open) => setBulkActionDialog(prev => ({ ...prev, open }))}
        title={`Confirm ${bulkActionDialog.action.replace('bulk-', '').replace('-', ' ')}`}
        description={`Are you sure you want to perform this action on ${selectedUsers.size} selected users?`}
        onConfirm={executeBulkOperation}
        isLoading={bulkActionDialog.isLoading}
      />
    </div>
  );
}
