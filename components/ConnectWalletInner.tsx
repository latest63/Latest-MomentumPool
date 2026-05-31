'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useState, useEffect } from 'react';

export default function ConnectWalletInner() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

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
    <button className="wallet-btn" onClick={() => open()}>
      Connect
    </button>
  );
}
