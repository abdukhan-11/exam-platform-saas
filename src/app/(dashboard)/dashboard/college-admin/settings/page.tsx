'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">College administration settings and configuration</p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            College Settings
          </CardTitle>
          <CardDescription>
            This page is under development. You can configure college administration settings here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Settings Coming Soon</h3>
            <p>This feature is currently being developed and will be available soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
