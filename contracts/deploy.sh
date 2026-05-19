#!/usr/bin/env bash
set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── Config ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR"
ENV_FILE="$CONTRACTS_DIR/.env"

# Load .env
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${RED}❌ .env file not found at $ENV_FILE${NC}"
    echo "   Copy .env.example to .env and fill in PRIVATE_KEY"
    exit 1
fi

echo -e "${YELLOW}══════════════════════════════════════${NC}"
echo -e "${YELLOW}  Momentum Pool — X Layer Deploy${NC}"
echo -e "${YELLOW}══════════════════════════════════════${NC}"
echo ""

NETWORK="${1:-testnet}"
if [ "$NETWORK" = "testnet" ]; then
    RPC="${XLAYER_TESTNET_RPC:-https://testrpc.xlayer.tech}"
    EXPLORER="https://www.okx.com/explorer/xlayer-test/tx"
    echo -e "  Network: ${GREEN}X Layer Testnet${NC}"
elif [ "$NETWORK" = "mainnet" ]; then
    RPC="${XLAYER_MAINNET_RPC:-https://rpc.xlayer.tech}"
    EXPLORER="https://www.okx.com/explorer/xlayer/tx"
    echo -e "  Network: ${YELLOW}X Layer Mainnet${NC}"
else
    echo -e "${RED}Unknown network: $NETWORK${NC}"
    echo "  Usage: ./deploy.sh [testnet|mainnet]"
    exit 1
fi

echo "  RPC: $RPC"
echo ""

# ── Check deployer balance ──
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
echo -e "  Deployer: ${GREEN}$DEPLOYER${NC}"
BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$RPC")
echo -e "  Balance:  ${YELLOW}$(echo "scale=4; $BALANCE / 10^18" | bc) OKB${NC}"

if [ "$BALANCE" -eq 0 ]; then
    echo -e "${RED}❌ Deployer has 0 OKB. Fund it first.${NC}"
    exit 1
fi
echo ""

# ── Build ──
echo -e "${YELLOW}📦 Building contracts...${NC}"
forge build
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# ── Deploy Factory ──
echo -e "${YELLOW}🚀 Deploying MomentumPoolFactory...${NC}"
FACTORY=$(forge create \
    --rpc-url "$RPC" \
    --private-key "$PRIVATE_KEY" \
    src/MomentumPoolFactory.sol:MomentumPoolFactory \
    --json | jq -r '.deployedTo')

echo -e "${GREEN}✅ Factory deployed: $FACTORY${NC}"
echo -e "   ${EXPLORER}/$FACTORY"
echo ""

# ── Set up a test match pool ──
echo -e "${YELLOW}📋 Creating a test match pool...${NC}"

# Example: Nigeria vs Brazil, kickoff in 5 min, half-end in 55 min
KICKOFF=$(date +%s -d '+5 minutes')
DEADLINE=$(date +%s -d '+15 minutes')   # deposit window: +15 min
HALF_END=$(date +%s -d '+60 minutes')   # half ends: +60 min from now

echo "  Match: Nigeria vs Brazil (Half 1)"
echo "  Deposit deadline: $(date -d @$DEADLINE)"
echo "  Half ends: $(date -d @$HALF_END)"

cast send "$FACTORY" \
    'createPool(string,uint8,string,string,uint256,uint256)' \
    'example_001' 1 'Nigeria' 'Brazil' \
    "$DEADLINE" "$HALF_END" \
    --rpc-url "$RPC" \
    --private-key "$PRIVATE_KEY" > /dev/null

echo -e "${GREEN}✅ Pool created${NC}"
echo ""

# ── Summary ──
echo -e "${YELLOW}══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo ""
echo "  Factory:      $FACTORY"
echo "  Network:      $NETWORK"
echo ""
echo "  ⚡ Export for backend:"
echo "    export FACTORY=$FACTORY"
echo "    export RPC=$RPC"
echo "    export PRIVATE_KEY=0x..."
echo ""
echo -e "${YELLOW}══════════════════════════════════════${NC}"
