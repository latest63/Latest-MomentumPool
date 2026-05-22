'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { mainnet } from 'wagmi/chains';

const queryClient = new QueryClient();

// ── X Layer chain definition ──
const xLayer = {
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
    public: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/explorer/xlayer' },
  },
} as const;

// ── Config ──
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '';

export const config = createConfig({
  chains: [xLayer],
  connectors: [
    injected({ target: 'metaMask' }),
    injected({ target: 'okxWallet' }),
    walletConnect({ projectId, showQrModal: true }),
  ],
  transports: {
    [xLayer.id]: http(),
  },
});

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
