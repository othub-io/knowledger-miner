const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config/.miner_config');
const miner_config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const queryTypes = require("../../util/queryTypes");
const queryDB = queryTypes.queryDB();

const paranet_workers = miner_config.paranet_workers

module.exports = {
  handleError: async function handleError(message) {
    try {
      let query;
      let params;
      
      console.log(
        `${paranet_workers[message.index].name} wallet ${
          paranet_workers[message.index].public_key
        }: Unexpected Error. ${message.error}. Abandoning...`
      );
      query = `UPDATE asset_header SET progress = ? WHERE approver = ? AND progress = ? AND blockchain = ?`;
      params = [
        "CREATE-ABANDONED",
        paranet_workers[message.index].public_key,
        "PROCESSING",
        message.blockchain
      ];
      await queryDB
        .getData(query, params)
        .then((results) => {
          //console.log('Query results:', results);
          return results;
          // Use the results in your variable or perform further operations
        })
        .catch((error) => {
          console.error("Error retrieving data:", error);
        });
      return;
    } catch (error) {
      console.log(error);
    }
  },
};
