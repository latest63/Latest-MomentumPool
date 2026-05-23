'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { LoadingProvider } from './LoadingOverlay';
import ThemeAudio from '@/lib/ThemeAudio';

const Web3ModalProvider = dynamic(
  () => import('@/components/Web3ModalProvider').then(m => ({ default: m.Web3ModalProvider })),
  { ssr: false }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Web3ModalProvider>
      <LoadingProvider>
        {children}
        <ThemeAudio />
      </LoadingProvider>
    </Web3ModalProvider>
  );
}
