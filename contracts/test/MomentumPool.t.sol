// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MomentumPool.sol";
import "../src/MomentumPoolFactory.sol";

contract MomentumPoolTest is Test {
    MomentumPoolFactory factory;
    MomentumPool pool;
    address owner = makeAddr("owner");
    address userA = makeAddr("userA");
    address userB = makeAddr("userB");

    uint256 depositDeadline;
    uint256 halfEnd;

    function setUp() public {
        vm.startPrank(owner);
        factory = new MomentumPoolFactory();

        depositDeadline = block.timestamp + 15 minutes;
        halfEnd = block.timestamp + 60 minutes;

        address poolAddr = factory.createPool(
            "match_123", 1, "Nigeria", "Brazil", address(0),
            depositDeadline, halfEnd
        );
        pool = MomentumPool(payable(poolAddr));
        vm.stopPrank();

        // Fund test users
        vm.deal(userA, 100 ether);
        vm.deal(userB, 100 ether);

        // Debug: log timestamps
        emit log_named_uint("block.timestamp", block.timestamp);
        emit log_named_uint("depositDeadline", depositDeadline);
        emit log_named_uint("halfEnd", halfEnd);
        emit log_named_uint("pool.state()", uint256(pool.state()));
    }

    function test_Deposit() public {
        vm.prank(userA);
        pool.deposit{value: 1 ether}(0, 0);

        (uint256 home, uint256 away) = pool.getPoolTotals();
        assertEq(home, 1 ether);
        assertEq(away, 0);
    }

    function test_DepositBothTeams() public {
        vm.prank(userA);
        pool.deposit{value: 2 ether}(0, 0);

        vm.prank(userB);
        pool.deposit{value: 1 ether}(1, 0);

        (uint256 home, uint256 away) = pool.getPoolTotals();
        assertEq(home, 2 ether);
        assertEq(away, 1 ether);
    }

    function test_RevertIfDepositAfterDeadline() public {
        skip(16 minutes);

        vm.prank(userA);
        vm.expectRevert("Deposit window closed");
        pool.deposit{value: 1 ether}(0, 0);
    }

    function test_SettleAndWithdraw() public {
        vm.prank(userA);
        pool.deposit{value: 2 ether}(0, 0);

        vm.prank(userB);
        pool.deposit{value: 1 ether}(1, 0);

        skip(61 minutes);

        vm.prank(owner);
        pool.settle(0, 12, 5);

        vm.prank(userA);
        uint256 balanceBefore = address(userA).balance;
        pool.withdraw();
        uint256 payout = address(userA).balance - balanceBefore;

        assertEq(payout, 2.98 ether);
    }

    function test_CancelOnTie() public {
        vm.prank(userA);
        pool.deposit{value: 1 ether}(0, 0);

        vm.prank(userB);
        pool.deposit{value: 1 ether}(1, 0);

        skip(61 minutes);

        vm.prank(owner);
        pool.cancel();

        vm.prank(userA);
        uint256 before = address(userA).balance;
        pool.withdraw();
        assertEq(address(userA).balance - before, 1 ether);
    }

    function test_WithdrawNothingIfLost() public {
        vm.prank(userA);
        pool.deposit{value: 1 ether}(1, 0);

        vm.prank(userB);
        pool.deposit{value: 2 ether}(0, 0);

        skip(61 minutes);

        vm.prank(owner);
        pool.settle(0, 10, 3);

        vm.prank(userA);
        vm.expectRevert("Nothing to claim");
        pool.withdraw();
    }

    function test_OwnerCannotSettleBeforeHalfEnd() public {
        vm.prank(owner);
        vm.expectRevert("Half hasn't ended");
        pool.settle(0, 5, 2);
    }

    function test_OwnerCannotSettleTie() public {
        skip(61 minutes);
        vm.prank(owner);
        vm.expectRevert("Tie - use cancel()");
        pool.settle(0, 5, 5);
    }

    function test_FactoryCreatesPool() public {
        assertEq(factory.poolCount(), 1);

        MomentumPoolFactory.PoolInfo memory info = factory.getPools(0, 10)[0];
        assertEq(info.pool, address(pool));
        assertEq(info.matchId, "match_123");
        assertEq(info.homeTeam, "Nigeria");
    }
}
