'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Calendar, GraduationCap, MapPin, Edit, Save, X, Camera } from 'lucide-react';

interface StudentProfile {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  rollNo: string | null;
  phone: string | null;
  bio: string | null;
  avatar: string | null;
  department: string | null;
  college: {
    id: string;
    name: string;
  } | null;
  studentFields?: {
    studentId?: string;
    year?: number;
    major?: string;
    gpa?: number;
    expectedGraduation?: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    department: '',
    year: 1,
    major: '',
    gpa: 0
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      const data = await response.json();
      setProfile(data);
      
      // Initialize edit form
      setEditForm({
        name: data.name || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        department: data.department || '',
        year: data.studentFields?.year || 1,
        major: data.studentFields?.major || '',
        gpa: data.studentFields?.gpa || 0
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          bio: editForm.bio,
          department: editForm.department,
          studentFields: {
            year: editForm.year,
            major: editForm.major,
            gpa: editForm.gpa
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');

    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        department: profile.department || '',
        year: profile.studentFields?.year || 1,
        major: profile.studentFields?.major || '',
        gpa: profile.studentFields?.gpa || 0
      });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const result = await response.json();
      setProfile(prev => prev ? { ...prev, avatar: result.avatarUrl } : null);
      setSuccess('Avatar updated successfully!');

    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-500 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Profile not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal information and academic details</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-500 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name || 'Student'} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    profile.name ? profile.name.charAt(0).toUpperCase() : 'S'
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile.name || 'Student'}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                {profile.rollNo && (
                  <Badge variant="outline" className="mt-2">
                    Roll No: {profile.rollNo}
                  </Badge>
                )}
                {profile.college && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {profile.college.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-sm py-2">{profile.name || 'Not provided'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                ) : (
                  <p className="text-sm py-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-sm py-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {profile.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                {isEditing ? (
                  <Input
                    id="department"
                    value={editForm.department}
                    onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                    placeholder="Enter your department"
                  />
                ) : (
                  <p className="text-sm py-2">{profile.department || 'Not provided'}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              ) : (
                <p className="text-sm py-2">{profile.bio || 'No bio provided'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Academic Year</Label>
                {isEditing ? (
                  <Select value={editForm.year.toString()} onValueChange={(value) => setEditForm({...editForm, year: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="5">5th Year</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm py-2">{profile.studentFields?.year ? `${profile.studentFields.year}st Year` : 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">Major/Field of Study</Label>
                {isEditing ? (
                  <Input
                    id="major"
                    value={editForm.major}
                    onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                    placeholder="Enter your major"
                  />
                ) : (
                  <p className="text-sm py-2">{profile.studentFields?.major || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                {isEditing ? (
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={editForm.gpa}
                    onChange={(e) => setEditForm({...editForm, gpa: parseFloat(e.target.value) || 0})}
                    placeholder="Enter your GPA"
                  />
                ) : (
                  <p className="text-sm py-2">{profile.studentFields?.gpa || 'Not specified'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Member since:</span>
                <p className="text-muted-foreground">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="font-medium">Last updated:</span>
                <p className="text-muted-foreground">
                  {new Date(profile.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
