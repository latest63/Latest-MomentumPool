'use client';

import { useEffect, type ReactNode } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { config } from '@/lib/wagmi-config';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '';

// Single initialization, runs once on first client import
let initialized = false;
if (typeof window !== 'undefined' && !initialized) {
  initialized = true;
  createWeb3Modal({
    wagmiConfig: config as any,
    projectId: projectId || 'MOMENTUM_POOL_DEV',
    enableAnalytics: false,
    metadata: {
      name: 'Momentum Pool',
      description: 'World Cup 2026 Fan Pools on X Layer',
      url: 'https://momentumpool.vercel.app',
      icons: [],
    },
  });
}

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
