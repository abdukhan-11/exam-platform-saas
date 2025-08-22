'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function Providers({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
