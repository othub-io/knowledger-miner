const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config/.miner_config');
const miner_config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const requestBlockData = require("./requestBlockData"); // Import the function from the separate file

const blockchains = miner_config.blockchains;
const environment = miner_config.environment;

// Function to start creating pending uploads for each blockchain
async function createPendingUpload(blockchain) {
  try {
    setTimeout(async () => {
      await createPendingUpload(blockchain);
    }, blockchain.block_time_sec * 1000);

    await requestBlockData(blockchain, miner_config);
  } catch (error) {
    console.error("Error processing creating uploads:", error);
  }
}

// Iterate through blockchains and initiate processing if enabled and matches environment
for (const blockchain of blockchains) {
  if (blockchain.enabled === "true" && blockchain.network === environment) {
    createPendingUpload(blockchain).catch(err => {
      console.error(`Error starting processing for blockchain ${blockchain.name}:`, err);
    });
  }
}
