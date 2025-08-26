'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  collegeId?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  importedUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess, collegeId }: BulkImportDialogProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [csvData, setCsvData] = useState('');
  const [defaultRole, setDefaultRole] = useState(UserRole.STUDENT);

  const canBulkImport = session?.user && PermissionService.hasPermission(session.user.role, Permission.BULK_IMPORT_USERS);

  const availableRoles = [
    { value: UserRole.STUDENT, label: 'Student' },
    { value: UserRole.TEACHER, label: 'Teacher' },
  ];

  if (canBulkImport && session?.user.role === UserRole.COLLEGE_ADMIN) {
    availableRoles.push({ value: UserRole.COLLEGE_ADMIN, label: 'College Admin' });
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData.trim()) return;

    setLoading(true);
    setImportResult(null);

    try {
      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const users = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length >= 3) { // At least email, name, role
          const user: any = {
            email: values[0] || '',
            name: values[1] || '',
            role: values[2] || defaultRole,
          };

          // Map additional fields if they exist
          if (values[3]) user.department = values[3];
          if (values[4]) user.position = values[4];
          if (values[5]) user.phone = values[5];
          if (values[6]) user.studentId = values[6];
          if (values[7]) user.year = parseInt(values[7]) || undefined;
          if (values[8]) user.major = values[8];
          if (values[9]) user.isActive = values[9].toLowerCase() === 'true';

          users.push(user);
        }
      }

      const response = await fetch('/api/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users,
          collegeId: collegeId || session?.user.collegeId,
          options: {
            sendWelcomeEmails: false,
            defaultPassword: 'TempPassword123!',
            skipExisting: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import users');
      }

      const result = await response.json();
      setImportResult(result);

      if (result.successfulImports > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error importing users:', error);
      alert(error instanceof Error ? error.message : 'Failed to import users');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/users/bulk-import');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to local template
        const template = 'email,name,role,department,position,phone,studentId,year,major,isActive\n"john.doe@example.com","John Doe","STUDENT","Computer Science","Student","+1234567890","STU001","2","Computer Science","true"\n"jane.smith@example.com","Jane Smith","TEACHER","Mathematics","Professor","+1234567891","","","","true"';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const resetForm = () => {
    setCsvData('');
    setImportResult(null);
    setDefaultRole(UserRole.STUDENT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
        </DialogHeader>

        {!importResult ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultRole">Default Role</Label>
                <Select value={defaultRole} onValueChange={(value) => setDefaultRole(value as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>CSV File</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="mb-2"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="csvData">Or Paste CSV Data</Label>
                <Textarea
                  id="csvData"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="email,name,role,department,position,phone,studentId,year,major,isActive&#10;john.doe@example.com,John Doe,STUDENT,Computer Science,Student,+1234567890,STU001,2,Computer Science,true"
                  rows={8}
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">CSV Format Requirements:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>First column: Email (required)</li>
                    <li>Second column: Name (required)</li>
                    <li>Third column: Role (required: SUPER_ADMIN, COLLEGE_ADMIN, TEACHER, STUDENT)</li>
                    <li>Fourth column: Department (optional)</li>
                    <li>Fifth column: Position (optional)</li>
                    <li>Sixth column: Phone (optional)</li>
                    <li>Seventh column: Student ID (optional)</li>
                    <li>Eighth column: Year (optional, for students)</li>
                    <li>Ninth column: Major (optional, for students)</li>
                    <li>Tenth column: Is Active (optional: true/false)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !csvData.trim()}>
                {loading ? 'Importing...' : 'Import Users'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Import Results
                  {importResult.success > 0 && importResult.failed === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : importResult.failed > 0 ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.successfulImports}</div>
                    <div className="text-sm text-gray-600">Successfully Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.failedImports}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                    <div className="text-sm text-gray-600">Total Processed</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Errors:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge variant="destructive">Row {error.row}</Badge>
                          <span className="text-red-600">{error.email}: {error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetForm}
              >
                Import More
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
