'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';

export default function ConnectWalletInner() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="wallet-btn wallet-btn-skel">...</div>;

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <button className="wallet-addr" onClick={() => disconnect()} title="Disconnect">
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button className="wallet-btn" onClick={() => {
      // Open Web3Modal (shows wallet list with QR for mobile)
      import('@web3modal/wagmi/react').then(m => {
        m.useWeb3Modal().open();
      });
    }}>
      Connect
    </button>
  );
}
