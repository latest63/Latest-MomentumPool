'use client';

import { useAccount, useDisconnect, useConnect, useConnectors } from 'wagmi';
import { useState, useEffect } from 'react';

export default function ConnectWalletInner() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const [mounted, setMounted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

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
    <>
      <button className="wallet-btn" onClick={() => setShowPicker(true)}>
        Connect
      </button>
      {showPicker && (
        <div className="wallet-picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="wallet-picker" onClick={e => e.stopPropagation()}>
            <button className="wallet-picker-close" onClick={() => setShowPicker(false)}>✕</button>
            <h3>Connect Wallet</h3>
            <div className="wallet-picker-list">
              {connectors.filter(c => c.id !== 'w3mAuth').map(connector => (
                <button
                  key={connector.id}
                  className="wallet-picker-item"
                  onClick={() => { connect({ connector }); setShowPicker(false); }}
                >
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
