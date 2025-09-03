'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  Shield,
  Settings
} from 'lucide-react';

interface CollegeAdminProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  role: string;
  college: {
    id: string;
    name: string;
    address?: string;
    subscriptionStatus: string;
  };
  createdAt: string;
  lastLogin?: string;
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    darkMode: boolean;
  };
}

export default function CollegeAdminProfilePage() {
  const [profile, setProfile] = useState<CollegeAdminProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    preferences: {
      notifications: true,
      emailUpdates: true,
      darkMode: false
    }
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          preferences: data.preferences || {
            notifications: true,
            emailUpdates: true,
            darkMode: false
          }
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        preferences: profile.preferences || {
          notifications: true,
          emailUpdates: true,
          darkMode: false
        }
      });
    }
    setIsEditing(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // In a real app, you would upload the file to a storage service
      // For now, we'll just show a placeholder
      const reader = new FileReader();
      reader.onload = (e) => {
        const avatarUrl = e.target?.result as string;
        setFormData(prev => ({ ...prev, avatar: avatarUrl }));
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('Failed to upload avatar');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-96 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your college admin profile and preferences
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name || 'Admin'} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    profile.name ? profile.name.charAt(0).toUpperCase() : 'A'
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      id="avatar-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                <p className="text-muted-foreground">{profile.email}</p>
                <Badge className="mt-2">
                  <Shield className="h-3 w-3 mr-1" />
                  College Admin
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone || 'Not provided'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself"
                    rows={3}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded">
                    <span>{profile.bio || 'No bio provided'}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* College Information & Preferences */}
        <div className="space-y-6">
          {/* College Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                College Information
              </CardTitle>
              <CardDescription>
                Your college details and subscription status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{profile.college.name}</span>
              </div>
              
              {profile.college.address && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.college.address}</span>
                </div>
              )}

              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Subscription: </span>
                <Badge variant={profile.college.subscriptionStatus === 'ACTIVE' ? 'default' : 'secondary'}>
                  {profile.college.subscriptionStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined: {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              
              {profile.lastLogin && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Last Login: {new Date(profile.lastLogin).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Push Notifications</Label>
                {isEditing ? (
                  <input
                    id="notifications"
                    type="checkbox"
                    checked={formData.preferences.notifications}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, notifications: e.target.checked }
                    }))}
                    className="rounded"
                  />
                ) : (
                  <Badge variant={profile.preferences.notifications ? 'default' : 'secondary'}>
                    {profile.preferences.notifications ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="emailUpdates">Email Updates</Label>
                {isEditing ? (
                  <input
                    id="emailUpdates"
                    type="checkbox"
                    checked={formData.preferences.emailUpdates}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, emailUpdates: e.target.checked }
                    }))}
                    className="rounded"
                  />
                ) : (
                  <Badge variant={profile.preferences.emailUpdates ? 'default' : 'secondary'}>
                    {profile.preferences.emailUpdates ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode">Dark Mode</Label>
                {isEditing ? (
                  <input
                    id="darkMode"
                    type="checkbox"
                    checked={formData.preferences.darkMode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, darkMode: e.target.checked }
                    }))}
                    className="rounded"
                  />
                ) : (
                  <Badge variant={profile.preferences.darkMode ? 'default' : 'secondary'}>
                    {profile.preferences.darkMode ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
