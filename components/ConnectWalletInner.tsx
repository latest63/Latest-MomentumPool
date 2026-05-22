'use client';

import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useWeb3Modal, createWeb3Modal } from '@web3modal/wagmi/react';
import { config } from '@/lib/wagmi-config';
import { useState, useEffect } from 'react';

// Idempotent init — runs on first client import. If Web3ModalProvider loaded
// first, this is a no-op. If this loads first, it sets up the AppKit singleton
// so useWeb3Modal() below won't throw.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '';
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

export default function ConnectWalletInner() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { open } = useWeb3Modal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-balance">
          {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : ''}
        </span>
        <button className="wallet-addr" onClick={() => disconnect()} title="Disconnect">
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button className="wallet-btn" onClick={() => open()}>
      Connect Wallet
    </button>
  );
}
