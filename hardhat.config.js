require("@nomiclabs/hardhat-waffle")
require('dotenv').config()

const { ALCHEMY_ROPSTEN, ETH_TEST_ACCOUNT } = process.env

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.8.4',
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_ROPSTEN}`,
      accounts: [ETH_TEST_ACCOUNT]
    }
  }
}
