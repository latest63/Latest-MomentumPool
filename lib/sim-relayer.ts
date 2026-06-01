/**
 * Server-side pool deployment & settlement using viem + owner key.
 */
import { createWalletClient, createPublicClient, http, decodeEventLog, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { FACTORY_ABI, POOL_ABI } from '@/lib/pool-abi';

const xLayer = {
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
} as const;

function getClients() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not configured');
  const account = privateKeyToAccount(pk as `0x${string}`);
  const transport = http();
  return {
    wallet: createWalletClient({ account, chain: xLayer, transport }),
    public: createPublicClient({ chain: xLayer, transport }),
  };
}

/** address(0) = native OKB */
const NATIVE = '0x0000000000000000000000000000000000000000';

/**
 * Deploy a new MomentumPool with 2-min timestamps via the factory.
 * @param tokenAddress address(0) for native OKB, or an ERC20 token address
 */
export async function deployPool(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  tokenAddress: string = NATIVE,
): Promise<string> {
  const factoryAddr = process.env.NEXT_PUBLIC_POOL_FACTORY;
  if (!factoryAddr) throw new Error('POOL_FACTORY not configured');

  const { wallet, public: publicClient } = getClients();
  const now = BigInt(Math.floor(Date.now() / 1000));
  const depositDeadline = now + BigInt(3600); // 1hr deposit window (pre-match)
  const halfEnd = now + BigInt(9000);          // 1hr + 90min = 2.5hr total (deposit + full match)

  const hash = await wallet.writeContract({
    address: getAddress(factoryAddr),
    abi: FACTORY_ABI,
    functionName: 'createPool',
    args: [matchId, 1, homeTeam, awayTeam, getAddress(tokenAddress), depositDeadline, halfEnd],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics });
      if (event.eventName === 'PoolCreated') {
        return event.args.pool as string;
      }
    } catch { /* skip non-event logs */ }
  }

  throw new Error('Pool deployed but address not found in event logs');
}

/**
 * Settle or cancel a pool on-chain.
 */
export async function settlePool(
  poolAddress: string,
  winner: 'home' | 'away',
  homeScore: number,
  awayScore: number,
): Promise<{ action: string; txHash: string }> {
  const { wallet } = getClients();
  const isTie = homeScore === awayScore;

  const hash = await (isTie
    ? wallet.writeContract({
        address: getAddress(poolAddress),
        abi: POOL_ABI,
        functionName: 'cancel',
      })
    : wallet.writeContract({
        address: getAddress(poolAddress),
        abi: POOL_ABI,
        functionName: 'settle',
        args: [winner === 'home' ? 0 : 1, BigInt(homeScore || 0), BigInt(awayScore || 0)],
      })
  );

  return { action: isTie ? 'cancel' : 'settle', txHash: hash };
}
