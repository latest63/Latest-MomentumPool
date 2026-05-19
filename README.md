# Momentum Pool ⚡

**X Cup Hackathon — OKX X Layer**

Pick the team with more *momentum* in a football half (goals, shots, corners, cards).  
No prediction markets. Pure GameFi.

---

## How It Works

1. A pool opens 15 min before each half
2. Deposit into **Team A** or **Team B**
3. Match kicks off — live momentum bar updates every 15s
4. At half-time, momentum score is computed from real events
5. Winners split the losers' pool (minus 2% fee)
6. Tie → everyone gets refunded

## Point System

| Event | Points |
|-------|--------|
| Goal | +5 |
| Woodwork | +2 |
| Shot on Target | +1 |
| Corner | +1 |
| Foul | -1 |
| Yellow Card | -3 |
| Red Card | -5 |

## Stack

- **Contracts** — Solidity + Foundry → X Layer (chain 196)
- **Frontend** — Next.js 15 + API routes → Vercel
- **Relayer** — Vercel Cron Jobs (settles pools at half-time)
- **Data** — API-Football for live match events

## Project Structure

```
momentum-pool/
├── contracts/
│   ├── src/
│   │   ├── MomentumPool.sol          # Per-half pool
│   │   └── MomentumPoolFactory.sol   # Pool deployer
│   ├── test/MomentumPool.t.sol       # 10 tests
│   ├── script/Deploy.s.sol
│   ├── deploy.sh                      # Deploy to X Layer
│   └── foundry.toml
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                   # Main UI
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── matches/route.ts       # List matches
│   │       ├── match/[id]/route.ts    # Match detail
│   │       ├── match/[id]/momentum/   # Live scores
│   │       └── cron/settle/route.ts   # Relayer
│   ├── components/MomentumMeter.tsx   # Bar + Feed + PoolCard
│   ├── lib/momentum.ts                # Shared engine
│   ├── vercel.json                    # Cron jobs
│   └── package.json
│
└── README.md
```

## Deploy

### 1. Contracts (X Layer)

```bash
cd contracts
cp .env.example .env   # set PRIVATE_KEY
bash deploy.sh testnet
```

### 2. Frontend (Vercel)

```bash
cd frontend
pnpm install
pnpm dev        # local dev on :3000
```

Deploy to Vercel:
- Import `frontend/` as the project root
- Add env vars in Vercel dashboard:
  - `PRIVATE_KEY` — wallet that owns the Factory
  - `FACTORY_ADDRESS` — deployed factory address
  - `XLAYER_RPC` — default: `https://testrpc.xlayer.tech`
  - `SPORTS_API_KEY` — optional, for live data

Vercel Cron automatically runs `/api/cron/settle` every 2 min.

## Hackathon Edge

| Criteria | Why It Hits |
|----------|-------------|
| **Innovation** | Momentum, not prediction. Nobody else is doing this. |
| **Market Potential** | Football fans love real-time betting-adjacent games. Viral mechanic. |
| **Completion** | 2 contracts, 10 tests passing, full frontend. Ships in days. |
| **On-chain** | Every settlement is an X Layer tx. Verifiable. |
