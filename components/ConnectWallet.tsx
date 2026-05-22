'use client';

import dynamic from 'next/dynamic';

const ConnectWalletInner = dynamic(
  () => import('./ConnectWalletInner'),
  { ssr: false, loading: () => <div className="wallet-btn wallet-btn-skel">...</div> }
);

export default function ConnectWallet() {
  return <ConnectWalletInner />;
}
