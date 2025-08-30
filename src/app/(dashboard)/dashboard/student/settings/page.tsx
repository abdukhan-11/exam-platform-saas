'use client';

import React from 'react';
import { UserProfileForm } from '@/components/user-management/UserProfileForm';
import ChangePasswordForm from '@/components/user/ChangePasswordForm';
import AvatarUploader from '@/components/user/AvatarUploader';
import { useSession } from 'next-auth/react';

export default function StudentSettingsPage() {
  const { data } = useSession();
  const user = data?.user as any | undefined;

  if (!user?.id) {
    return <div className="p-6">Please sign in to manage your profile.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground">Update your personal information, preferences, and password.</p>
      </div>

      <UserProfileForm userId={user.id} />

      <AvatarUploader userId={user.id} />

      <ChangePasswordForm userId={user.id} />
    </div>
  );
}


