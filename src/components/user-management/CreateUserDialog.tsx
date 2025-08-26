'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserRole } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  collegeId?: string;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess, collegeId }: CreateUserDialogProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    rollNo: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.STUDENT,
    phone: '',
    dateOfBirth: '',
    address: '',
  });

  const canCreateSuperAdmin = session?.user && PermissionService.hasPermission(session.user.role, Permission.CREATE_USER);
  const canCreateCollegeAdmin = session?.user && PermissionService.hasPermission(session.user.role, Permission.CREATE_USER);

  const availableRoles = [
    { value: UserRole.STUDENT, label: 'Student' },
    { value: UserRole.TEACHER, label: 'Teacher' },
  ];

  if (canCreateCollegeAdmin) {
    availableRoles.push({ value: UserRole.COLLEGE_ADMIN, label: 'College Admin' });
  }

  if (canCreateSuperAdmin && session?.user.role === UserRole.SUPER_ADMIN) {
    availableRoles.push({ value: UserRole.SUPER_ADMIN, label: 'Super Admin' });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          collegeId: collegeId || session?.user.collegeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        email: '',
        rollNo: '',
        password: '',
        firstName: '',
        lastName: '',
        role: UserRole.STUDENT,
        phone: '',
        dateOfBirth: '',
        address: '',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStudentRole = formData.role === UserRole.STUDENT;
  const isTeacherOrAdminRole = [UserRole.TEACHER, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN].includes(formData.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
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

          {isStudentRole && (
            <div>
              <Label htmlFor="rollNo">Roll Number *</Label>
              <Input
                id="rollNo"
                value={formData.rollNo}
                onChange={(e) => handleInputChange('rollNo', e.target.value)}
                required
                placeholder="Enter student roll number"
              />
            </div>
          )}

          {isTeacherOrAdminRole && (
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="Enter email address"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              minLength={6}
              placeholder="Enter password (minimum 6 characters)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter address"
              rows={3}
            />
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
