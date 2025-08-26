'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, User, Mail, Phone, Building, Briefcase, FileText } from 'lucide-react';
import { UserRole } from '@prisma/client';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  bio?: string;
  avatar?: string;
  role: UserRole;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      examReminders?: boolean;
      gradeNotifications?: boolean;
    };
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    timezone?: string;
  };
  teacherFields?: {
    subjects?: string[];
    qualifications?: string[];
    experience?: number;
    officeHours?: string;
    officeLocation?: string;
  };
  studentFields?: {
    studentId?: string;
    year?: number;
    major?: string;
    gpa?: number;
    expectedGraduation?: string;
  };
  collegeAdminFields?: {
    permissions?: string[];
    department?: string;
    responsibilities?: string[];
  };
}

interface UserProfileFormProps {
  userId: string;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export function UserProfileForm({ userId, onSuccess, readOnly = false }: UserProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    bio: '',
    avatar: '',
    preferences: {
      notifications: {
        email: true,
        push: true,
        examReminders: true,
        gradeNotifications: true,
      },
      theme: 'system' as 'light' | 'dark' | 'system',
      language: 'en',
      timezone: 'UTC',
    },
    teacherFields: {
      subjects: [] as string[],
      qualifications: [] as string[],
      experience: 0,
      officeHours: '',
      officeLocation: '',
    },
    studentFields: {
      studentId: '',
      year: 1,
      major: '',
      gpa: 0,
      expectedGraduation: '',
    },
    collegeAdminFields: {
      permissions: [] as string[],
      department: '',
      responsibilities: [] as string[],
    },
  });

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/profile`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      setProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        department: data.department || '',
        position: data.position || '',
        bio: data.bio || '',
        avatar: data.avatar || '',
        preferences: {
          notifications: {
            email: data.preferences?.notifications?.email ?? true,
            push: data.preferences?.notifications?.push ?? true,
            examReminders: data.preferences?.notifications?.examReminders ?? true,
            gradeNotifications: data.preferences?.notifications?.gradeNotifications ?? true,
          },
          theme: data.preferences?.theme || 'system',
          language: data.preferences?.language || 'en',
          timezone: data.preferences?.timezone || 'UTC',
        },
        teacherFields: {
          subjects: data.teacherFields?.subjects || [],
          qualifications: data.teacherFields?.qualifications || [],
          experience: data.teacherFields?.experience || 0,
          officeHours: data.teacherFields?.officeHours || '',
          officeLocation: data.teacherFields?.officeLocation || '',
        },
        studentFields: {
          studentId: data.studentFields?.studentId || '',
          year: data.studentFields?.year || 1,
          major: data.studentFields?.major || '',
          gpa: data.studentFields?.gpa || 0,
          expectedGraduation: data.studentFields?.expectedGraduation || '',
        },
        collegeAdminFields: {
          permissions: data.collegeAdminFields?.permissions || [],
          department: data.collegeAdminFields?.department || '',
          responsibilities: data.collegeAdminFields?.responsibilities || [],
        },
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
      setProfile(data);
      
      if (onSuccess) {
        onSuccess();
      }

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load profile</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>Profile updated successfully!</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              disabled={readOnly}
              rows={3}
              maxLength={500}
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific Fields */}
      {profile.role === 'TEACHER' && (
        <Card>
          <CardHeader>
            <CardTitle>Teacher Information</CardTitle>
            <CardDescription>Your teaching details and qualifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.teacherFields.experience}
                  onChange={(e) => handleNestedInputChange('teacherFields', 'experience', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="officeLocation">Office Location</Label>
                <Input
                  id="officeLocation"
                  value={formData.teacherFields.officeLocation}
                  onChange={(e) => handleNestedInputChange('teacherFields', 'officeLocation', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="officeHours">Office Hours</Label>
              <Input
                id="officeHours"
                value={formData.teacherFields.officeHours}
                onChange={(e) => handleNestedInputChange('teacherFields', 'officeHours', e.target.value)}
                disabled={readOnly}
                placeholder="e.g., Mon-Fri 9:00 AM - 5:00 PM"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {profile.role === 'STUDENT' && (
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>Your academic details and progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentFields.studentId}
                  onChange={(e) => handleNestedInputChange('studentFields', 'studentId', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="year">Academic Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.studentFields.year}
                  onChange={(e) => handleNestedInputChange('studentFields', 'year', parseInt(e.target.value) || 1)}
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  value={formData.studentFields.major}
                  onChange={(e) => handleNestedInputChange('studentFields', 'major', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={formData.studentFields.gpa}
                  onChange={(e) => handleNestedInputChange('studentFields', 'gpa', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="expectedGraduation">Expected Graduation</Label>
              <Input
                id="expectedGraduation"
                type="date"
                value={formData.studentFields.expectedGraduation}
                onChange={(e) => handleNestedInputChange('studentFields', 'expectedGraduation', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Your application preferences and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Notifications</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="text-sm font-normal">Email Notifications</Label>
                <Switch
                  id="email-notifications"
                  checked={formData.preferences.notifications.email}
                  onCheckedChange={(checked) => handleNestedInputChange('preferences', 'notifications', { ...formData.preferences.notifications, email: checked })}
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications" className="text-sm font-normal">Push Notifications</Label>
                <Switch
                  id="push-notifications"
                  checked={formData.preferences.notifications.push}
                  onCheckedChange={(checked) => handleNestedInputChange('preferences', 'notifications', { ...formData.preferences.notifications, push: checked })}
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="exam-reminders" className="text-sm font-normal">Exam Reminders</Label>
                <Switch
                  id="exam-reminders"
                  checked={formData.preferences.notifications.examReminders}
                  onCheckedChange={(checked) => handleNestedInputChange('preferences', 'notifications', { ...formData.preferences.notifications, examReminders: checked })}
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="grade-notifications" className="text-sm font-normal">Grade Notifications</Label>
                <Switch
                  id="grade-notifications"
                  checked={formData.preferences.notifications.gradeNotifications}
                  onCheckedChange={(checked) => handleNestedInputChange('preferences', 'notifications', { ...formData.preferences.notifications, gradeNotifications: checked })}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={formData.preferences.theme}
                onValueChange={(value) => handleNestedInputChange('preferences', 'theme', value)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.preferences.language}
                onValueChange={(value) => handleNestedInputChange('preferences', 'language', value)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
