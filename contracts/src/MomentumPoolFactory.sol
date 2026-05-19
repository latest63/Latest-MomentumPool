// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MomentumPool.sol";

/// @title MomentumPoolFactory — deploy and track pools
contract MomentumPoolFactory {
    address public owner;

    struct PoolInfo {
        address pool;
        string matchId;      // external sports API match ID
        uint8 halfNumber;    // 1 or 2
        string homeTeam;
        string awayTeam;
        uint256 depositDeadline;
        uint256 halfEnd;
        bool settled;
    }

    PoolInfo[] public pools;
    mapping(address => uint256) public poolIndex; // pool addr → index + 1 (0 = invalid)

    event PoolCreated(
        address indexed pool,
        string matchId,
        uint8 halfNumber,
        string homeTeam,
        string awayTeam,
        uint256 depositDeadline,
        uint256 halfEnd
    );

    constructor() {
        owner = msg.sender;
    }

    /// @notice Spin up a new pool for a match-half
    /// @dev Only owner (backend) creates pools
    function createPool(
        string calldata _matchId,
        uint8 _halfNumber,
        string calldata _homeTeam,
        string calldata _awayTeam,
        uint256 _depositDeadline,
        uint256 _halfEnd
    ) external returns (address) {
        require(msg.sender == owner, "Only owner");
        require(_halfNumber == 1 || _halfNumber == 2, "Invalid half");
        require(_depositDeadline < _halfEnd, "Deadline must be before half-end");

        MomentumPool pool = new MomentumPool(msg.sender, _depositDeadline, _halfEnd);
        address poolAddr = address(pool);

        pools.push(PoolInfo({
            pool: poolAddr,
            matchId: _matchId,
            halfNumber: _halfNumber,
            homeTeam: _homeTeam,
            awayTeam: _awayTeam,
            depositDeadline: _depositDeadline,
            halfEnd: _halfEnd,
            settled: false
        }));

        poolIndex[poolAddr] = pools.length; // 1-indexed

        emit PoolCreated(poolAddr, _matchId, _halfNumber, _homeTeam, _awayTeam, _depositDeadline, _halfEnd);
        return poolAddr;
    }

    /// @notice Count of all pools
    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    /// @notice Get a range of pools (pagination for frontend)
    function getPools(uint256 offset, uint256 limit) external view returns (PoolInfo[] memory) {
        if (offset >= pools.length) return new PoolInfo[](0);
        uint256 end = offset + limit;
        if (end > pools.length) end = pools.length;
        uint256 count = end - offset;

        PoolInfo[] memory result = new PoolInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = pools[offset + i];
        }
        return result;
    }

    /// @notice Mark a pool as settled (called after settlement tx)
    function markSettled(address poolAddr) external {
        require(msg.sender == owner, "Only owner");
        uint256 idx = poolIndex[poolAddr];
        require(idx > 0, "Unknown pool");
        pools[idx - 1].settled = true;
    }
}
