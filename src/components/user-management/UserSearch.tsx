'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Users, Filter, RefreshCw } from 'lucide-react';
import { UserRole } from '@prisma/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
  isActive: boolean;
  college: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
  showActions?: boolean;
  collegeId?: string;
}

export function UserSearch({ onUserSelect, showActions = true, collegeId }: UserSearchProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [searchParams, setSearchParams] = useState({
    query: '',
    role: '',
    department: '',
    isActive: '',
  });

  useEffect(() => {
    if (searchParams.query || searchParams.role || searchParams.department || searchParams.isActive) {
      searchUsers();
    }
  }, [searchParams, collegeId]);

  const searchUsers = async (newOffset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (searchParams.query) {
        params.append('q', searchParams.query);
      }
      if (searchParams.role) {
        params.append('role', searchParams.role);
      }
      if (searchParams.department) {
        params.append('department', searchParams.department);
      }
      if (searchParams.isActive) {
        params.append('isActive', searchParams.isActive);
      }
      if (collegeId) {
        params.append('collegeId', collegeId);
      }
      
      params.append('limit', limit.toString());
      params.append('offset', newOffset.toString());

      const response = await fetch(`/api/users/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search users');
      }

      setUsers(data.users);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    searchUsers(0);
  };

  const handleInputChange = (field: string, value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setSearchParams({
      query: '',
      role: '',
      department: '',
      isActive: '',
    });
    setUsers([]);
    setTotal(0);
    setOffset(0);
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      SUPER_ADMIN: { variant: 'destructive' as const, text: 'Super Admin' },
      COLLEGE_ADMIN: { variant: 'default' as const, text: 'College Admin' },
      TEACHER: { variant: 'secondary' as const, text: 'Teacher' },
      STUDENT: { variant: 'outline' as const, text: 'Student' },
    };

    const config = roleConfig[role] || roleConfig.STUDENT;

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const handlePreviousPage = () => {
    if (offset > 0) {
      searchUsers(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      searchUsers(offset + limit);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Search
        </CardTitle>
        <CardDescription>Search and filter users by various criteria</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="Name, email, department..."
                value={searchParams.query}
                onChange={(e) => handleInputChange('query', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={searchParams.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="COLLEGE_ADMIN">College Admin</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="Department name"
                value={searchParams.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="isActive">Status</Label>
              <Select value={searchParams.isActive} onValueChange={(value) => handleInputChange('isActive', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </form>

        {/* Results */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {users.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} users
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchUsers(offset)}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>College</TableHead>
                    {showActions && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                      <TableCell>{user.college.name}</TableCell>
                      {showActions && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onUserSelect?.(user)}
                            >
                              View Profile
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={offset === 0 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={offset + limit >= total || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {users.length === 0 && !loading && (searchParams.query || searchParams.role || searchParams.department || searchParams.isActive) && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found matching your criteria</p>
          </div>
        )}

        {users.length === 0 && !loading && !searchParams.query && !searchParams.role && !searchParams.department && !searchParams.isActive && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter search criteria to find users</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
