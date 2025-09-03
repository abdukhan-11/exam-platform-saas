'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';

export default function SubjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-muted-foreground">Manage academic subjects and curriculum</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Management
          </CardTitle>
          <CardDescription>
            This page is under development. You can manage all academic subjects here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Subject Management Coming Soon</h3>
            <p>This feature is currently being developed and will be available soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
