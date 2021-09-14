const chai = require('chai')
const { ethers, waffle } = require('hardhat')

chai.use(waffle.solidity)

const { expect } = chai

const defaultConstructorProps = {
  percentageOfTips: '10'
}

async function deployContract (constructorOverrides) {
  const {
    percentageOfTips
  } = {
    ...defaultConstructorProps,
    ...constructorOverrides
  }

  const ContractFactory = await ethers.getContractFactory('TipJarWithLeaderboard')
  const contract = await ContractFactory.deploy(percentageOfTips)
  await contract.deployed()

  return contract
}

async function setupLeaderboard (jar, amounts = [10, 6, 3]) {
  const [firstPlace, secondPlace, thirdPlace] = await ethers.getSigners()
  const [firstAddr, secondAddr, thirdAddr] = await Promise.all(
    [firstPlace, secondPlace, thirdPlace].map(s => s.getAddress())
  )

  // TODO make transactions
}

describe('TipJar with Leaderboard', () => {
  it('should revert when a zero value is used for the tip', async () => {
    const jar = await deployContract()

    const [owner] = await ethers.getSigners()
    const ownerAddr = await owner.getAddress()

    await expect(jar.tip({ value: 0 })).to.be.revertedWith('A zero ether tip is a bit rude')
  })

  it('should have no one on the leaderboard at initialization', async () => {
    const jar = await deployContract()

    const results = [0, 1, 2].map(async idx => {
      const [addr, balance] = await jar.leaderAtPosition(idx)
      return { addr, balance }
    })

    const leaderboard = await Promise.all(results)

    for (let idx = 0; idx < results.length; idx += 1) {
      expect(leaderboard[idx].addr).to.be.equal('0x0000000000000000000000000000000000000000')
      expect(leaderboard[idx].balance.toNumber()).to.be.equal(0)
    }
  })

  it('should set first tipper to the top of the leaderboard', async () => {
    const jar = await deployContract()

    const [owner] = await ethers.getSigners()
    const ownerAddr = await owner.getAddress()

    const tx = await jar.tip({ value: ethers.utils.parseEther('1.0') })
    await tx.wait()

    const [leaderAddr, leaderBal] = await jar.leaderAtPosition(0)
    expect(leaderAddr).to.be.equal(ownerAddr)
    expect(leaderBal).to.be.equal(ethers.utils.parseEther('1.0'))
  })

  it('should create an ordered leaderboard from four tippers', async () => {
    const jar = await deployContract()

    const startingEther = 20
    const testSigners = (await ethers.getSigners()).slice(0, 5).map((s, idx) => ({
      signer: s,
      ether: startingEther - (idx * 3)
    }))

    for (let idx = 0; idx < testSigners.length; idx += 1) {
      const value = ethers.utils.parseEther(`${testSigners[idx].ether.toString()}.0`)
      const tx = await jar.connect(testSigners[idx].signer).tip({ value })
      await tx.wait()
    }

    const results = [0, 1, 2].map(async idx => {
      const [addr, balance] = await jar.leaderAtPosition(idx)
      return { addr, balance }
    })

    const leaderboard = await Promise.all(results)

    const signerLeaders = testSigners.slice(0, 3).map(s => s.signer)

    for (let idx = 0; idx < results.length; idx += 1) {
      expect(leaderboard[idx].addr).to.be.equal(await signerLeaders[idx].getAddress())
    }
  })
})
