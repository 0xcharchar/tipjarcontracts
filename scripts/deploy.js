require('dotenv').config()

const hre = require('hardhat')

async function tipJarNft (tipperURI, collectorURI, name = 'TipJarNft', symbol = 'CCTJNFT', minimumTip = '0.0') {
  await hre.run('compile')

  const ContractFactory = await hre.ethers.getContractFactory('TipJarNft')
  const contract = await ContractFactory.deploy(name, symbol, ethers.utils.parseEther(minimumTip), tipperURI, collectorURI)
  await contract.deployed()

  console.log(`Deployed '${name}' to ${contract.address}`)
}

// TODO yargs

tipJarNft('https://gateway.pinata.cloud/ipfs/QmYwionyNirUk8fHFNGGXo2eEgMLcjSAbTyw3CPPL6KNJD', 'https://gateway.pinata.cloud/ipfs/QmQP8ZDNMBw85hhNaWaFG9Mq4739DUCwf2AeiZGJVBCrFU')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
