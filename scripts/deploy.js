const hre = require('hardhat')

async function main (tipperURI, collectorURI, name = 'TipJarNft', symbol = 'TJNFT', minimumTip = '0.0') {
  const ContractFactory = await hre.ethers.getContractFactory('TipJarNft')
  const contract = await ContractFactory.deploy(name, symbol, ethers.utils.parseEther(minimumTip), tipperURI, collectorURI)
  await contract.deployed()

  console.log('Deployed to:', contract.address)
}

// TODO yargs

main('tipper', 'collector')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
