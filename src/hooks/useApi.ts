'use client';

import { useEffect, useRef, useState } from 'react';

type UseApiOptions<T> = {
  initialData?: T;
  revalidateMs?: number; // polling interval
};

export function useApi<T = any>(url: string | null, options?: UseApiOptions<T>) {
  const [data, setData] = useState<T | undefined>(options?.initialData);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const cacheRef = useRef<Map<string, { value: any; ts: number }>>(new Map());

  const fetcher = async () => {
    if (!url) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      cacheRef.current.set(url, { value: json, ts: Date.now() });
      setData(json);
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (url) {
      const cached = cacheRef.current.get(url);
      if (cached) setData(cached.value as T);
      fetcher();
      if (options?.revalidateMs && options.revalidateMs > 0) {
        interval = setInterval(fetcher, options.revalidateMs);
      }
    }
    return () => interval && clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, error, loading, refresh: fetcher } as const;
}

export default useApi;


