'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImagePlus, Loader2 } from 'lucide-react';

interface Props {
  userId: string;
  onUploaded?: (url: string) => void;
}

export default function AvatarUploader({ userId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const openFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    // Validate type/size
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB).');
      return;
    }

    // Local preview
    const url = URL.createObjectURL(file);
    setPreview(url);

    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const res = await fetch('/api/uploads/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Save to profile
      const updateRes = await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: data.url }),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateJson.error || 'Failed to save avatar');

      onUploaded?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                No Image
              </div>
            )}
          </div>

          <div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <Button type="button" onClick={openFile} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


