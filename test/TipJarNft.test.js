const chai = require('chai')
const { ethers, waffle } = require('hardhat')

chai.use(waffle.solidity)

const { expect } = chai

async function deployContract (tip = '0.0') {
  const ContractFactory = await ethers.getContractFactory('TipJarNft')
  const contract = await ContractFactory.deploy('TipJarNft', 'TJNFT', ethers.utils.parseEther(tip), 'tipper', 'collector')
  await contract.deployed()

  return contract
}

function parseTransferEvent (events) {
  const [ev] = events
  return {
    from: ev.args[0],
    to: ev.args[1],
    tokenId: ev.args[2].toNumber()
  }
}

describe('TipJarNft', function () {
  it('should default to 0 ether for minimum tip', async () => {
    const nft = await deployContract()

    expect(await nft.s_minimumTip()).to.be.equal(ethers.utils.parseEther('0'))
  })

  it('should be able to change minimum tip', async () => {
    const tips = await deployContract()

    expect(await tips.s_minimumTip()).to.be.equal(ethers.utils.parseEther('0'))

    const tx = await tips.changeMinimumTip(ethers.utils.parseEther('1.0'))
    await tx.wait()

    expect(await tips.s_minimumTip()).to.be.equal(ethers.utils.parseEther('1.0'))
  })

  it('should revert when tip is less than minimum', async () => {
    const tips = await deployContract()

    const tx = await tips.changeMinimumTip(ethers.utils.parseEther('1.0'))
    await tx.wait()

    await expect(tips.tip({ value: 0 })).to.be.reverted
  })

  it('should mint a token with enough tip', async () => {
    const tips = await deployContract()

    const tx = await tips.tip()
    const { tokenId } = parseTransferEvent((await tx.wait()).events)

    expect(tokenId).to.be.equal(0)

    const [owner] = await ethers.getSigners()
    expect(await tips.balanceOf(await owner.getAddress())).to.be.equal(1)
  })

  it('should mint when ether is sent to contract', async () => {
    const jar = await deployContract()

    const [owner] = await ethers.getSigners()
    const tx = {
      to: jar.address,
      value: ethers.utils.parseEther('1.0'),
    }
    const mining = await owner.sendTransaction(tx)
    const { events } = await mining.wait()

    const contractBalance = await ethers.provider.getBalance(jar.address)
    expect(contractBalance).to.be.equal(ethers.utils.parseEther('1'))

    const tokensOwned = await jar.balanceOf(await owner.getAddress())
    expect(tokensOwned.toNumber()).to.be.equal(1)
  })

  it('should mint on tip and show that the token has not been transferred', async () => {
    const jar = await deployContract()

    const tx = await jar.tip()
    const { tokenId } = parseTransferEvent((await tx.wait()).events)

    expect(await jar.isTokenTransferred(tokenId)).to.be.false
  })

  it('should use tipper URI when no transfer has happened', async () => {
    const jar = await deployContract()

    const tx = await jar.tip()
    const { tokenId } = parseTransferEvent((await tx.wait()).events)

    expect(await jar.isTokenTransferred(tokenId)).to.be.false
    expect(await jar.tokenURI(tokenId)).to.be.equal('tipper')
  })

  it('should use transefr URI when token owner is no longer original tipper', async () => {
    const jar = await deployContract()

    const tx = await jar.tip()
    const { tokenId } = parseTransferEvent((await tx.wait()).events)

    const signers = await ethers.getSigners()
    const [tipperAddr, collectorAddr] = await Promise.all(signers.map(s => s.getAddress()))

    const transferTx = await jar['safeTransferFrom(address,address,uint256)'](tipperAddr, collectorAddr, tokenId)
    await transferTx.wait()

    expect(await jar.tokenURI(tokenId)).to.be.equal('collector')
  })

  it('should show tipper URI after transferring back to original tipper', async () => {
    const jar = await deployContract()

    const tx = await jar.tip()
    const { tokenId } = parseTransferEvent((await tx.wait()).events)

    const [tipper, collector] = await ethers.getSigners()
    const [tipperAddr, collectorAddr] = await Promise.all([tipper, collector].map(s => s.getAddress()))

    const firstTransfer = await jar['safeTransferFrom(address,address,uint256)'](tipperAddr, collectorAddr, tokenId)
    await firstTransfer.wait()
    expect(await jar.tokenURI(tokenId)).to.be.equal('collector')

    const jarCollector = jar.connect(collector)
    const secondTransfer = await jarCollector['safeTransferFrom(address,address,uint256)'](collectorAddr, tipperAddr, tokenId)
    await secondTransfer.wait()
    expect(await jar.tokenURI(tokenId)).to.be.equal('tipper')
  })

  it('should allow owner to withdraw to anyone', async () => {
    const ownerContractAccess = await deployContract()
    expect(await ethers.provider.getBalance(ownerContractAccess.address)).to.be.equal(ethers.utils.parseEther('0.0'))

    const [owner, tipper, ownerCold] = await ethers.getSigners()
    
    const tipperContractAddress = ownerContractAccess.connect(tipper)

    // tipper tips
    const tipTx = await tipperContractAddress.tip({ value: ethers.utils.parseEther('1.0') })
    await tipTx.wait()

    // owner withdraws to cold
    const coldStartingBalance = await ownerCold.getBalance()
    const withdrawTx = await ownerContractAccess.withdraw(await ownerCold.getAddress())
    await withdrawTx.wait()

    expect(await ownerCold.getBalance()).to.be.gt(coldStartingBalance)
  })
})
