'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  createdAt: string | Date;
  readAt?: string | Date | null;
  metadata?: any;
};

export default function NotificationCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=50', { cache: 'no-store' });
      const data = await res.json();
      setItems(data.items || []);
      setUnread(data.unreadCount || 0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
      await load();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark read', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notifications {unread > 0 ? `(${unread} unread)` : ''}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between mb-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
          <Button size="sm" onClick={markAllRead} disabled={loading || unread === 0}>Mark all as read</Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`border rounded p-2 ${n.readAt ? '' : 'bg-primary/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm">{n.message}</div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


