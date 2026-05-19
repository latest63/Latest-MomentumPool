// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MomentumPool — settle at half-time, no live oracle needed
contract MomentumPool {
    /* ───── State ───── */
    address public owner;
    uint256 public depositDeadline;
    uint256 public halfEnd;
    uint256 public createdAt;

    enum State { OPEN, LIVE, SETTLED, CANCELLED }
    State public state;

    uint8 public winnerTeamId; // 0 = home, 1 = away
    uint256 public winningScore;
    uint256 public losingScore;

    struct PoolSide {
        uint256 total;
        mapping(address => uint256) deposits;
    }

    PoolSide public team0; // home
    PoolSide public team1; // away

    mapping(address => bool) public claimed;
    uint256 public protocolFees;

    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant DEPOSIT_WINDOW = 15 minutes;
    uint256 public constant MATCH_HALF = 45 minutes;

    /* ───── Events ───── */
    event Deposited(address indexed user, uint8 indexed teamId, uint256 amount);
    event Settled(uint8 indexed winnerTeamId, uint256 score0, uint256 score1);
    event Cancelled();
    event Withdrawn(address indexed user, uint256 amount);

    /* ───── Init ───── */
    constructor(address _owner, uint256 _depositDeadline, uint256 _halfEnd) {
        owner = _owner;
        depositDeadline = _depositDeadline;
        halfEnd = _halfEnd;
        createdAt = block.timestamp;
        state = State.OPEN;
    }

    /* ───── Deposit ───── */
    function deposit(uint8 teamId) external payable {
        require(state == State.OPEN, "Pool not open");
        require(block.timestamp < depositDeadline, "Deposit window closed");
        require(teamId == 0 || teamId == 1, "Invalid team");
        require(msg.value > 0, "Deposit must be > 0");

        PoolSide storage side = teamId == 0 ? team0 : team1;
        side.deposits[msg.sender] += msg.value;
        side.total += msg.value;

        emit Deposited(msg.sender, teamId, msg.value);
    }

    /* ───── Settlement (called by backend at half-time) ───── */
    function settle(uint8 _winner, uint256 score0, uint256 score1) external {
        require(msg.sender == owner, "Only owner");
        require(state == State.OPEN || state == State.LIVE, "Wrong state");
        require(block.timestamp >= halfEnd, "Half hasn't ended");
        require(score0 != score1, "Tie - use cancel()");
        require(_winner == 0 || _winner == 1, "Invalid team");
        require(score0 > 0 || score1 > 0, "At least one team must have scored");

        state = State.SETTLED;
        winnerTeamId = _winner;
        winningScore = _winner == 0 ? score0 : score1;
        losingScore  = _winner == 0 ? score1 : score0;

        uint256 losingTotal = _winner == 0 ? team1.total : team0.total;
        protocolFees = (losingTotal * FEE_BPS) / 10000;

        emit Settled(_winner, score0, score1);
    }

    /// @dev Cancel — called when scores are tied (everyone gets refunded)
    function cancel() external {
        require(msg.sender == owner, "Only owner");
        require(block.timestamp >= halfEnd, "Half hasn't ended");
        require(state == State.OPEN || state == State.LIVE, "Wrong state");

        state = State.CANCELLED;
        emit Cancelled();
    }

    /* ───── Withdraw ───── */
    /// @notice Claim winnings or refund (if cancelled/tied)
    function withdraw() external {
        require(state == State.SETTLED || state == State.CANCELLED, "Not settled yet");
        require(!claimed[msg.sender], "Already claimed");

        uint256 payout;

        if (state == State.CANCELLED) {
            // Tie → everyone gets their deposit back
            payout = team0.deposits[msg.sender] + team1.deposits[msg.sender];
        } else if (winnerTeamId == 0) {
            // Home team won
            uint256 myBet = team0.deposits[msg.sender];
            if (myBet > 0 && team0.total > 0) {
                // Winners split: their deposit + proportional share of losing pool (minus fee)
                uint256 losersNet = team1.total - protocolFees;
                payout = myBet + (myBet * losersNet / team0.total);
            }
        } else {
            // Away team won
            uint256 myBet = team1.deposits[msg.sender];
            if (myBet > 0 && team1.total > 0) {
                uint256 losersNet = team0.total - protocolFees;
                payout = myBet + (myBet * losersNet / team0.total);
            }
        }

        require(payout > 0, "Nothing to claim");
        claimed[msg.sender] = true;

        (bool ok,) = payable(msg.sender).call{value: payout}("");
        require(ok, "Transfer failed");

        emit Withdrawn(msg.sender, payout);
    }

    /* ───── Getters ───── */
    function getPoolTotals() external view returns (uint256, uint256) {
        return (team0.total, team1.total);
    }

    function getUserDeposit(address user) external view returns (uint256, uint256) {
        return (team0.deposits[user], team1.deposits[user]);
    }

    receive() external payable {}
}
