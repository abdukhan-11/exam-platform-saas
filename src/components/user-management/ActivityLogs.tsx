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
import { Loader2, Activity, Download, RefreshCw, Filter, Calendar } from 'lucide-react';
import { UserRole } from '@prisma/client';

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  sessionId?: string;
  collegeId?: string;
  role?: UserRole;
  user?: {
    name: string;
    email: string;
  };
}

interface ActivityLogsProps {
  userId?: string;
  collegeId?: string;
}

export function ActivityLogs({ userId, collegeId }: ActivityLogsProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    role: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchActivities();
  }, [filters, offset, userId, collegeId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
      }
      
      if (collegeId) {
        params.append('collegeId', collegeId);
      }
      
      if (filters.action) {
        params.append('action', filters.action);
      }
      
      if (filters.resourceType) {
        params.append('resourceType', filters.resourceType);
      }
      
      if (filters.role) {
        params.append('role', filters.role);
      }
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/users/activity-logs?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activity logs');
      }

      setActivities(data.activities);
      setTotal(data.total);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
      }
      
      if (collegeId) {
        params.append('collegeId', collegeId);
      }
      
      if (filters.action) {
        params.append('action', filters.action);
      }
      
      if (filters.resourceType) {
        params.append('resourceType', filters.resourceType);
      }
      
      if (filters.role) {
        params.append('role', filters.role);
      }
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      
      params.append('format', format);

      const response = await fetch(`/api/users/activity-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to export activity logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export activity logs');
    }
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      role: '',
      startDate: '',
      endDate: '',
    });
    setOffset(0);
  };

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const getActionBadge = (action: string) => {
    const actionConfig = {
      CREATE: { variant: 'default' as const, text: 'Created' },
      UPDATE: { variant: 'secondary' as const, text: 'Updated' },
      DELETE: { variant: 'destructive' as const, text: 'Deleted' },
      VIEW: { variant: 'outline' as const, text: 'Viewed' },
      LOGIN: { variant: 'default' as const, text: 'Login' },
      LOGOUT: { variant: 'secondary' as const, text: 'Logout' },
    };

    const config = actionConfig[action as keyof typeof actionConfig] || {
      variant: 'outline' as const,
      text: action,
    };

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      SUPER_ADMIN: { variant: 'destructive' as const, text: 'Super Admin' },
      COLLEGE_ADMIN: { variant: 'default' as const, text: 'College Admin' },
      STUDENT: { variant: 'outline' as const, text: 'Student' },
    } as const;

    const config = (roleConfig as any)[role] || roleConfig.STUDENT;

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>User activity and system logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading activity logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>User activity and system logs</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActivities}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <Label htmlFor="action">Action</Label>
            <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="VIEW">View</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="resourceType">Resource Type</Label>
            <Select value={filters.resourceType} onValueChange={(value) => setFilters(prev => ({ ...prev, resourceType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All resources</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="EXAM">Exam</SelectItem>
                <SelectItem value="QUESTION">Question</SelectItem>
                <SelectItem value="COLLEGE">College</SelectItem>
                <SelectItem value="SESSION">Session</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="COLLEGE_ADMIN">College Admin</SelectItem>
                
                <SelectItem value="STUDENT">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} activities
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        {new Date(activity.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {activity.user ? (
                          <div>
                            <div className="font-medium">{activity.user.name}</div>
                            <div className="text-sm text-gray-500">{activity.user.email}</div>
                          </div>
                        ) : (
                          activity.userId
                        )}
                      </TableCell>
                      <TableCell>{getActionBadge(activity.action)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{activity.resourceType}</div>
                          {activity.resourceId && (
                            <div className="text-sm text-gray-500">{activity.resourceId}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.role && getRoleBadge(activity.role)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {activity.ipAddress || '-'}
                      </TableCell>
                      <TableCell>
                        {Object.keys(activity.details).length > 0 ? (
                          <div className="text-sm">
                            {Object.entries(activity.details).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
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
      </CardContent>
    </Card>
  );
}
