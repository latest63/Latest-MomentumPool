import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// ── X Layer chain ──
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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '';

export const config = createConfig({
  chains: [xLayer],
  connectors: [
    injected(),
    walletConnect({ projectId, showQrModal: false }),
  ],
  transports: {
    [xLayer.id]: http(),
  },
});
