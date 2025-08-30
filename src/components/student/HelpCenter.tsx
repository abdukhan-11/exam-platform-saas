'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function HelpCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help & Documentation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            View the user guide and technical notes for the student dashboard below. These open in a new tab.
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <a href="/docs/student-dashboard-user-guide.md" target="_blank" rel="noreferrer">User Guide</a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href="/docs/student-dashboard-tech-notes.md" target="_blank" rel="noreferrer">Technical Notes</a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


