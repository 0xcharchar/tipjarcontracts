//SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TipJarNft is ERC721, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenId;

  uint256 public s_minimumTip = 0;
  mapping (uint256 => address) public s_originalTipper;

  string private s_tipperUri;
  string private s_transferredUri;

  constructor (string memory name, string memory symbol, uint256 minimumTip, string memory tipperUri, string memory transferredUri) ERC721 (name, symbol) {
    if (minimumTip > 0) {
      s_minimumTip = minimumTip;
    }

    s_tipperUri = tipperUri;
    s_transferredUri = transferredUri;
  }

  function changeMinimumTip (uint256 newMinTip) public onlyOwner {
    s_minimumTip = newMinTip;
  }

  function tip () public payable returns (uint256) {
    require(msg.value >= s_minimumTip, "Tip amount is too low to accept");

    uint256 mintId = _tokenId.current();
    _tokenId.increment();

    _safeMint(msg.sender, mintId);
    s_originalTipper[mintId] = msg.sender;

    return mintId;
  }

  function isTokenTransferred (uint256 tokenId) public view returns (bool) {
    address tipper = s_originalTipper[tokenId];
    address owner = ownerOf(tokenId);

    return tipper != owner;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

    address tipper = s_originalTipper[tokenId];
    address owner = ownerOf(tokenId);

    if (tipper == owner) {
      return s_tipperUri;
    } else {
      return s_transferredUri;
    }
  }

  function withdraw(address payable _to) public onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "No balance to withdraw");
    _to.transfer(balance);
  }

  receive() external payable {
    tip();
  }
}
