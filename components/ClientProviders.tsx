'use client';

import { ReactNode } from 'react';
import { LoadingProvider } from './LoadingOverlay';
import ThemeAudio from '@/lib/ThemeAudio';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      {children}
      <ThemeAudio />
    </LoadingProvider>
  );
}
