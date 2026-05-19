# ⚡ World Cup Momentum Pool — WE ARE 26

**X Cup Hackathon — OKX X Layer (2026 FIFA World Cup)**

**Slogan:** WE ARE 26

> Pick the dominant team in each half. Not predictions — *momentum*.

---

## 🏆 What is it?

A real-time GameFi dApp for the **2026 FIFA World Cup**, themed around the official **WE ARE 26** campaign. Before each match half, users deposit into **Team A** or **Team B**. During the half, real match events (goals, shots, corners, cards) accumulate **momentum points**. At half-time, the team with more momentum wins. Winners split the pot.

## ⚽ Point System

| Event | Points | Why |
|-------|--------|-----|
| Goal | **+5** | Biggest swing — changes the game |
| Woodwork | **+2** | So close — crowd erupts |
| Shot on Target | **+1** | Pressure building |
| Corner | **+1** | Territorial dominance |
| Foul | **-1** | Breaks flow |
| Yellow Card | **-3** | Team walks a tightrope |
| Red Card | **-5** | Match-defining negative |

## 🗓️ Hackathon Requirements

| Requirement | Status |
|-------------|--------|
| ✅ World Cup 2026 themed | WE ARE 26 slogan, 26 mark, host-nation color system |
| ✅ Built on X Layer | Solidity → Foundry → X Layer (chain 196) |
| ✅ On-chain settlement | MomentumPool.sol — `deposit()` / `settle()` / `withdraw()` |
| ✅ Dedicated X account | Create `@MomentumPoolWC` — tag @XLayerOfficial |
| ✅ Remote (no in-person) | Fully online |
| ✅ Demo video (bonus) | Record after deployment |

## 🏗️ Architecture

```
Frontend (Next.js → Vercel)
  ├── Live momentum bar (polls every 15s)
  ├── Pool deposit UI (wagmi → X Layer)
  └── Event feed (real match events)

Backend (Vercel Cron → /api/cron/settle)
  └── At half-time: settles the on-chain pool

Contracts (X Layer)
  ├── MomentumPool.sol
  ├── MomentumPoolFactory.sol
  └── 10 Foundry tests passing
```

## 🚀 Deploy

### 1. Contracts → X Layer

```bash
cd contracts
cp .env.example .env   # set PRIVATE_KEY
bash deploy.sh testnet
```

Export the factory address — you'll need it for Vercel.

### 2. Frontend → Vercel

```bash
cd frontend
pnpm install
pnpm dev
```

**Vercel deployment:**
1. Import `github.com/latest63/Latest-MomentumPool`
2. Root directory: `frontend/`
3. Framework: Next.js
4. Add env vars:
   - `PRIVATE_KEY` — deployer wallet
   - `FACTORY_ADDRESS` — from contract deployment
   - `XLAYER_RPC` — `https://testrpc.xlayer.tech`

Vercel Cron runs `/api/cron/settle` every 2 min to auto-settle pools.

## 🧪 Tests

```bash
cd contracts
forge test -vv   # 10/10 passing
```

## 📦 Repo Structure

```
├── contracts/
│   ├── src/MomentumPool.sol          # Core pool logic
│   ├── src/MomentumPoolFactory.sol   # Pool factory
│   ├── test/MomentumPool.t.sol       # Full test suite
│   ├── script/Deploy.s.sol           # Deploy script
│   ├── deploy.sh                     # One-command deploy
│   └── foundry.toml
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # WC-themed UI
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── matches/              # Match list
│   │       ├── match/[id]/           # Match detail
│   │       └── cron/settle/          # Relayer
│   ├── components/MomentumMeter.tsx  # Bar + Feed + Pool
│   ├── lib/momentum.ts               # Scoring engine
│   └── vercel.json                   # Cron config
│
└── README.md
```

## 🔗 Links

- **GitHub:** https://github.com/latest63/Latest-MomentumPool
- **X Layer:** https://rpc.xlayer.tech (chain 196)
- **OKX Hackathon:** https://web3.okx.com/xlayer/build-x-hackathon/xcup
