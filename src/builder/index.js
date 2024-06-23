const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config/.miner_config');
const miner_config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const requestBlockData = require("./requestBlockData.js");
const blockchains = miner_config.blockchains
const environment = miner_config.environment

async function createPendingUpload(blockchain) {
  try {
    setTimeout(
      createPendingUpload(blockchain),
      blockchain.block_time_sec * 1000
    );
    await requestBlockData.requestBlockData(blockchain);
  } catch (error) {
    console.error("Error processing creating uploads:", error);
  }
}

for (const blockchain of blockchains) {
  if (
    blockchain.enabled === "true" &&
    blockchain.network === environment
  ) {
    createPendingUpload(blockchain);
  }
}