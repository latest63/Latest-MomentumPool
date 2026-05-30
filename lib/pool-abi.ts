/* ═══════════════════════════════════════════
   MomentumPool + Factory ABIs (X Layer)
   ═══════════════════════════════════════════ */

export const POOL_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [{ name: 'teamId', type: 'uint8' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'state',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'winnerTeamId',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'claimed',
    type: 'function',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'getUserDeposit',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'getPoolTotals',
    type: 'function',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'settle',
    type: 'function',
    inputs: [
      { name: '_winner', type: 'uint8' },
      { name: 'score0', type: 'uint256' },
      { name: 'score1', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'cancel',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'owner',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    name: 'depositDeadline',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'halfEnd',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const FACTORY_ABI = [
  {
    name: 'createPool',
    type: 'function',
    inputs: [
      { name: '_matchId', type: 'string' },
      { name: '_halfNumber', type: 'uint8' },
      { name: '_homeTeam', type: 'string' },
      { name: '_awayTeam', type: 'string' },
      { name: '_depositDeadline', type: 'uint256' },
      { name: '_halfEnd', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'poolCount',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'PoolCreated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'pool', type: 'address', indexed: true },
      { name: 'matchId', type: 'string', indexed: false },
      { name: 'halfNumber', type: 'uint8', indexed: false },
      { name: 'homeTeam', type: 'string', indexed: false },
      { name: 'awayTeam', type: 'string', indexed: false },
      { name: 'depositDeadline', type: 'uint256', indexed: false },
      { name: 'halfEnd', type: 'uint256', indexed: false },
    ],
  },
] as const;
