'use client';

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="wallet-btn wallet-btn-skel">...</div>;

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-balance">
          {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : ''}
        </span>
        <span className="wallet-addr">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button className="wallet-disconnect" onClick={() => disconnect()} title="Disconnect">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connectors">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          className="wallet-btn"
          onClick={() => connect({ connector })}
        >
          {connector.id === 'injected'
            ? '🦊 MetaMask'
            : connector.id === 'okxWallet'
              ? '🔷 OKX Wallet'
              : connector.name}
        </button>
      ))}
    </div>
  );
}
