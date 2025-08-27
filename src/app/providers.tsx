'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';

interface AuthProviderProps {
  children: ReactNode;
}

export function Providers({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="system" storageKey="exam-saas-theme">
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
