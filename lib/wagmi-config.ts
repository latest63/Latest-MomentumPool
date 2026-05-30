import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// ── X Layer Testnet ──
const xLayer = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
    public: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/explorer/xlayer-test' },
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
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});
