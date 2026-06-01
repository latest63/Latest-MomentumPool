import { createPublicClient, http } from 'viem';

/** X Layer Testnet */
const X_LAYER = {
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
} as const;

export const publicClient = createPublicClient({
  chain: X_LAYER,
  transport: http(),
});
