'use client';

import { useEffect, ReactNode } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi';
import { config } from '@/lib/wagmi-config';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '';

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    createWeb3Modal({
      wagmiConfig: config,
      projectId: projectId || 'MOMENTUM_POOL_DEV',
      enableAnalytics: false,
      metadata: {
        name: 'Momentum Pool',
        description: 'World Cup 2026 Fan Pools on X Layer',
        url: 'https://momentumpool.vercel.app',
        icons: [''],
      },
    });
  }, []);

  return <>{children}</>;
}
