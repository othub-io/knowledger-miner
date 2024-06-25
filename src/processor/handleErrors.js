const fs = require("fs");
const path = require("path");
const configPath = path.resolve(__dirname, "../../config/.miner_config");
const miner_config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const queryTypes = require("../../util/queryTypes");
const queryDB = queryTypes.queryDB();

const paranet_workers = miner_config.paranet_workers;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  handleError: async function handleError(message) {
    try {
      let query;
      let params;

      if (
        message.error === "Safe mode validation error." ||
        message.error ===
          "File format is corrupted, no n-quads are extracted." ||
        message.error ===
          `Invalid JSON-LD syntax; "@type" value must a string, an array of strings, an empty object, or a default object.` ||
        message.error.includes("undefined")
      ) {
        console.log(
          `${paranet_workers[message.index].name} wallet ${
            paranet_workers[message.index].public_key
          }: Create failed. ${message.error} Abandoning...`
        );
        query = `UPDATE asset_header SET progress = ? WHERE approver = ? AND progress = ? AND blockchain = ?`;
        params = [
          "CREATE-ABANDONED",
          paranet_workers[message.index].public_key,
          "PROCESSING",
          message.blockchain,
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
      }

      if (message.request === "RETRY-CREATE") {
        console.log(
          `${paranet_workers[message.index].name} wallet ${
            paranet_workers[message.index].public_key
          }: Create failed. ${message.error}. Retrying in 1 minute...`
        );
        await sleep(60000);

        const query = `INSERT INTO asset_header (txn_id, progress, approver, blockchain, asset_data, ual, epochs) VALUES (UUID(),?,?,?,?,?,?)`;
        const params = [
          "RETRY-CREATE",
          null,
          dkg_blockchains[0].name,
          JSON.stringify(message.assetData),
          null,
          message.epochs,
        ];

        await queryDB.getData(query, params);
        return;
      }

      console.log(
        `${paranet_workers[message.index].name} wallet ${
          paranet_workers[message.index].public_key
        }: Create failed. ${
          message.error
        }. Reverting to pending in 1 minute...`
      );
      await sleep(60000);

      query = `UPDATE txn_header SET progress = ?, approver = ? WHERE approver = ? AND progress = ? AND blockchain = ?`;
      params = [
        "PENDING",
        null,
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
