'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'exam-saas:recent-searches';
const MAX_RECENTS = 10;

export function useSearchPreferences() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.filter((x) => typeof x === 'string'));
      }
    } catch {}
  }, []);

  const addRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setRecent([]);
  }, []);

  return { recent, addRecent, clearRecent } as const;
}

export default useSearchPreferences;


