import { useState, useEffect, useCallback } from 'react';

interface UsernameCheckResult {
  available: boolean;
  message?: string;
  error?: string;
  loading: boolean;
}

interface UsernameCheckResponse {
  available: boolean;
  message?: string;
  error?: string;
}

export function useUsernameAvailability(username: string, debounceMs: number = 500) {
  const [result, setResult] = useState<UsernameCheckResult>({
    available: false,
    loading: false
  });

  const checkUsername = useCallback(async (usernameToCheck: string): Promise<void> => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setResult({
        available: false,
        loading: false
      });
      return;
    }

    setResult(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/colleges/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameToCheck }),
      });

      const data: UsernameCheckResponse = await response.json();

      if (response.ok) {
        setResult({
          available: data.available,
          message: data.message,
          loading: false
        });
      } else {
        setResult({
          available: false,
          error: data.error || 'Failed to check username availability',
          loading: false
        });
      }
    } catch (error) {
      setResult({
        available: false,
        error: 'Network error while checking username',
        loading: false
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkUsername(username);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [username, debounceMs, checkUsername]);

  return result;
}
