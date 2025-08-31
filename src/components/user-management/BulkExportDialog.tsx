'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2, FileText, Table, Database } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeId?: string;
}

export function BulkExportDialog({ open, onOpenChange, collegeId }: BulkExportDialogProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'csv' as 'csv' | 'xlsx' | 'json',
    role: '' as UserRole | '',
    department: '',
    isActive: true,
    includeInactive: false,
  });

  const canExport = session?.user && PermissionService.hasPermission(session.user.role, Permission.VIEW_USERS);

  const availableRoles = [
    { value: '', label: 'All Roles' },
    { value: UserRole.STUDENT, label: 'Students' },
    
    { value: UserRole.COLLEGE_ADMIN, label: 'College Admins' },
  ];

  if (session?.user.role === UserRole.SUPER_ADMIN) {
    availableRoles.push({ value: UserRole.SUPER_ADMIN, label: 'Super Admins' });
  }

  const handleExport = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      
      if (exportOptions.role) {
        params.append('role', exportOptions.role);
      }
      if (exportOptions.department) {
        params.append('department', exportOptions.department);
      }
      if (exportOptions.isActive !== undefined) {
        params.append('isActive', exportOptions.isActive.toString());
      }
      if (exportOptions.includeInactive) {
        params.append('includeInactive', 'true');
      }
      if (collegeId) {
        params.append('collegeId', collegeId);
      }

      const response = await fetch('/api/users/bulk-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...exportOptions,
          collegeId: collegeId || session?.user.collegeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export users');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `users-export-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting users:', error);
      alert(error instanceof Error ? error.message : 'Failed to export users');
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <Table className="h-4 w-4" />;
      case 'xlsx':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <Database className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv':
        return 'Comma-separated values file, compatible with Excel and Google Sheets';
      case 'xlsx':
        return 'Excel spreadsheet format with formatting and multiple sheets';
      case 'json':
        return 'JSON format for programmatic use and data integration';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Users</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div>
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={exportOptions.format}
              onValueChange={(value) => setExportOptions(prev => ({ ...prev, format: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('csv')}
                    <span>CSV</span>
                  </div>
                </SelectItem>
                <SelectItem value="xlsx">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('xlsx')}
                    <span>Excel (XLSX)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('json')}
                    <span>JSON</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              {getFormatDescription(exportOptions.format)}
            </p>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <h3 className="font-medium">Filters</h3>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={exportOptions.role}
                onValueChange={(value) => setExportOptions(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={exportOptions.department}
                onValueChange={(value) => setExportOptions(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="History">History</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="active-only" className="text-sm font-normal">Active Users Only</Label>
                <Switch
                  id="active-only"
                  checked={exportOptions.isActive}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="include-inactive" className="text-sm font-normal">Include Inactive Users</Label>
                <Switch
                  id="include-inactive"
                  checked={exportOptions.includeInactive}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeInactive: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Information */}
          <Alert>
            <AlertDescription>
              The export will include user details such as name, email, role, department, 
              position, phone, and account status. Sensitive information like passwords 
              will not be included.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading || !canExport}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Users
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
