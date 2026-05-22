'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const Web3ModalProvider = dynamic(
  () => import('@/components/Web3ModalProvider').then(m => ({ default: m.Web3ModalProvider })),
  { ssr: false }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <Web3ModalProvider>{children}</Web3ModalProvider>;
}
