//SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TipJarWithLeaderboard is Ownable {
  uint8 constant s_topLeaderboardCount = 3;
  uint8 immutable s_shareBackPercentage;
  enum LeaderboardPlaces { First, Second, Third }

  address[s_topLeaderboardCount] private s_topTippers;
  mapping (address => uint256) private s_tipperBalances;
  mapping (address => uint256) private s_payoutBalances;
  uint256 private s_leaderPayoutTotal = 0;

  constructor (uint8 _percentageOfTips) {
    s_shareBackPercentage = _percentageOfTips;
  }

  function tip () public payable {
    require(msg.value > 0, "A zero ether tip is a bit rude");

    // memory copies
    uint8 leaderCount = s_topLeaderboardCount;
    address[s_topLeaderboardCount] memory leaderboard = s_topTippers;

    uint256 tipperNewBalance = s_tipperBalances[msg.sender] + msg.value;
    uint8 lowestIdx = 0;

    // check from lowest to highest
    for (uint8 idx = leaderCount; idx > 0; idx--) {
      address leader = leaderboard[idx - 1];
      uint256 leaderBalance = s_tipperBalances[leader];

      if (tipperNewBalance <= leaderBalance) {
        lowestIdx = idx;
        break;
      }
    }

    // if the sender did not make the leaderboard (based on lowestIdx), updating will be skipped
    address nextLeader = msg.sender;

    // now we count up, shifting any leaders
    for (uint8 idx = lowestIdx; idx < leaderCount; idx++) {
      address tmpAddr = leaderboard[idx];
      leaderboard[idx] = nextLeader;
      nextLeader = tmpAddr;

      // no point in shifting empty addresses
      if (nextLeader == address(0)) break;
    }

    // save the results
    s_tipperBalances[msg.sender] = tipperNewBalance;
    s_topTippers = leaderboard;
  }

  function leaderAtPosition (LeaderboardPlaces position) external view returns (address, uint256) {
    address posAddr = s_topTippers[uint8(position)];
    return (posAddr, s_tipperBalances[posAddr]);
  }

  function withdraw () external onlyOwner {
    uint256 leaderBalance = s_leaderPayoutTotal;
    address[3] memory leaderboard = s_topTippers;

    uint8[3] memory splits = [50, 30, 20];
    uint256 availableBalance = address(this).balance - leaderBalance;
    uint256 leaderCut = availableBalance - ((availableBalance * 100) / 10);

    // update balances
    for (uint8 idx = 0; idx < s_topLeaderboardCount; idx++) {
      address leader = leaderboard[idx];
      uint8 percentage = splits[idx];
      uint256 balanceCut = leaderCut - ((leaderCut * 100 ) / percentage);

      // update available balance of leader
      s_payoutBalances[leader] += balanceCut;
    }

    // TODO emit leaderboard update event
    // TODO emit owner withdraw event

    s_leaderPayoutTotal = leaderBalance + leaderCut;
    _withdraw(msg.sender, availableBalance - leaderCut);
  }

  function _withdraw (address withdrawTo, uint256 amount) private {
    (bool success, ) = address(withdrawTo).call{value: amount}("");
    require(success, "Failed to withdraw");
  }
}
