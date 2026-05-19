# Momentum Pool ⚡

**X Cup Hackathon — Build on X Layer**

Pick the team with more *momentum* in a half (goals, shots, corners, cards).  
No prediction markets — pure GameFi.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │ ──▶ │   Backend    │ ──▶ │   Contract   │
│  (Next.js)  │     │  (Express)   │     │  (X Layer)   │
│             │     │              │     │              │
│ Live meter  │     │ Sports API   │     │ deposit()    │
│ Event feed  │     │ Momentum     │     │ settle()     │
│ Deposit UI  │     │ calculator   │     │ withdraw()   │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
   reads API            cron 60s             half-time
   every 15s            settle pool          single tx
```

**Key insight:** Contract only touches money. Real-time fun is all frontend + sports API.

---

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

A goal + a red card in the same half ≈ wash. Realistic.

---

## Project Structure

```
momentum-pool/
├── contracts/
│   ├── src/
│   │   ├── MomentumPool.sol        # Per half pool
│   │   └── MomentumPoolFactory.sol # Pool deployer
│   ├── script/Deploy.s.sol
│   ├── foundry.toml
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── relayer.ts              # Cron + settlement
│   │   └── server.ts               # API for frontend
│   └── package.json
│
├── frontend/
│   ├── app/page.tsx
│   ├── components/MomentumMeter.tsx # Bar + feed + pool card
│   └── package.json
│
└── README.md
```

---

## Quick Start

### 1. Deploy Contracts

```bash
cd contracts
cp .env.example .env  # fill PRIVATE_KEY + RPC
forge install
forge script script/Deploy.s.sol --rpc-url xlayer_testnet --broadcast
```

### 2. Create a Pool

```bash
cast send $FACTORY \
  'createPool(string,uint8,string,string,uint256,uint256)' \
  '12345' 1 'Nigeria' 'Brazil' \
  $(date +%s -d '+10 minutes') \
  $(date +%s -d '+55 minutes') \
  --rpc-url $RPC --private-key $PK
```

### 3. Run Backend

```bash
cd backend
pnpm install
pnpm server     # API for frontend on :3001
pnpm relayer    # settles pools at half-time
```

### 4. Run Frontend

```bash
cd frontend
pnpm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 pnpm dev
```

---

## Hackathon Scoring Advantage

| Criteria | How Momentum Pool hits it |
|----------|--------------------------|
| **Innovation** | Nobody else does this. It's not prediction, not fantasy. It's *momentum*. |
| **Market Potential** | Football fans love real-time gambling-adjacent mechanics. Easy to share. |
| **Completion** | 3 contracts + 1 relayer + 1 meter component. Ships in 5 days. |
| **On-chain verifiability** | Every settlement is a tx on X Layer explorer. |
| **Demo video** | Live momentum bar + settling a pool = great 2-min clip. |
