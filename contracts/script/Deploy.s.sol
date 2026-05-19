// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MomentumPoolFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MomentumPoolFactory factory = new MomentumPoolFactory();

        vm.stopBroadcast();

        console2.log("Factory deployed at:");
        console2.log(vm.toString(address(factory)));
        console2.log("");
        console2.log("Next steps:");
        console2.log("  1. Export address:");
        console2.log(string.concat("     export FACTORY=", vm.toString(address(factory))));
        console2.log("  2. Create a pool:");
        console2.log(string.concat("     cast send $FACTORY 'createPool(string,uint8,string,string,uint256,uint256)' 'match_123' 1 'Nigeria' 'Brazil' $(date +%s -d '+10 minutes') $(date +%s -d '+55 minutes') --rpc-url $RPC --private-key $PK"));
    }
}
