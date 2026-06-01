'use client';

import { ReactNode } from 'react';
import { LoadingProvider } from './LoadingOverlay';
import { Web3ModalProvider } from './Web3ModalProvider';
import ThemeAudio from '@/lib/ThemeAudio';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      <Web3ModalProvider>
        {children}
        <ThemeAudio />
      </Web3ModalProvider>
    </LoadingProvider>
  );
}
