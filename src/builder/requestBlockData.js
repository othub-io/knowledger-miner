const { Web3 } = require("web3");
const queryTypes = require("../../util/queryTypes.js");
const queryDB = queryTypes.queryDB();

const validateAssetData = (assetData) => {
  if (
    typeof assetData["@type"] !== "string" &&
    !Array.isArray(assetData["@type"])
  ) {
    return false;
  }

  if (
    assetData.transactionDetails &&
    typeof assetData.transactionDetails["@type"] !== "string"
  ) {
    return false;
  }

  if (
    assetData.potentialAction &&
    typeof assetData.potentialAction["@type"] !== "string"
  ) {
    return false;
  }

  return true;
};

const requestBlockData = async (blockchain, miner_config) => {
  try {
    const web3 = new Web3(blockchain.rpc);
    const latestBlockNumber = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(latestBlockNumber, true);
    const txn_index = Math.floor(Math.random() * block.transactions.length);
    const tx = block.transactions[txn_index];

    console.log(
      `Building asset from blockchain: ${blockchain.name} - block ${latestBlockNumber} - tx: ${txn_index +1} / ${block.transactions.length}`
    );

    const assetData = {
      "@context": "http://schema.org",
      "@type": "Event",
      "name": `${blockchain.name} Transaction ${tx.hash}`,
      "description": `A transaction on the ${blockchain.name} blockchain.`,
      "startDate": new Date().toISOString(),
      "endDate": new Date().toISOString(),
      "eventStatus": "EventCompleted",
      "location": {
        "@type": "Place",
        "name": `${blockchain.name} Blockchain`,
        "description": `Public ledger for ${blockchain.name} transactions.`,
      },
      "url": `${blockchain.explorer}/tx/${tx.hash}`,
      "potentialAction": {
        "@type": "ViewAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${blockchain.explorer}/tx/${tx.hash}`,
        },
      },
      "transactionDetails": {
        "@type": "DigitalDocument",
        "author": {
          "@type": "Person",
          "name": tx.from,
        },
        "datePublished": new Date().toISOString(),
        "encodingFormat": "application/json",
        "hash": tx.hash,
      },
      "from": tx.from,
      "to": tx.to,
      "input": tx.input,
      "r": tx.r,
      "s": tx.s,
      "blockNumber": tx.blockNumber.toString(),
      "chainId": tx.chainId ? tx.chainId.toString() : null,
      "gas": tx.gas.toString(),
      "gasPrice": tx.gasPrice.toString(),
      "nonce": tx.nonce.toString(),
      "transactionIndex": tx.transactionIndex.toString(),
      "type": tx.type ? tx.type.toString() : null,
      "v": tx.v.toString(),
      "value": tx.value.toString(),
    };

    const valid = validateAssetData(assetData);

    if (valid) {
      const dkg_blockchains = miner_config.dkg_blockchains;
      const epochs = miner_config.epochs;
      const query = `INSERT INTO asset_header (txn_id, progress, approver, blockchain, asset_data, ual, epochs) VALUES (UUID(),?,?,?,?,?,?)`;
      const params = ["PENDING", null, dkg_blockchains[0].name ,JSON.stringify(assetData) ,null, epochs];

      await queryDB.getData(query, params);
      return;
    }
  } catch (error) {
    console.error("Error requesting block data:", error.message);
    throw error; // Rethrow the error to handle it in the caller function
  }
};

module.exports = requestBlockData;
