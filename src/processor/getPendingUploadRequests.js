const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config/.miner_config');
const miner_config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const queryTypes = require("../../util/queryTypes.js");
const queryDB = queryTypes.queryDB();

const blockchains = miner_config.blockchains
const paranet_workers = miner_config.paranet_workers

module.exports = {
  getPendingUploadRequests: async function getPendingUploadRequests() {
    try {
      console.log(`Checking for assets to process...`);
      let query;
      let params;
      let pending_requests = [];
      for (const blockchain of blockchains) {
        query =
          "select txn_id,progress,approver,blockchain,asset_data,epochs,updated_at,created_at FROM asset_header WHERE progress = ? AND blockchain = ? ORDER BY created_at ASC LIMIT 1";
        params = ["PENDING", blockchain.name];
        let request = await queryDB
          .getData(query, params)
          .then((results) => {
            //console.log('Query results:', results);
            return results;
            // Use the results in your variable or perform further operations
          })
          .catch((error) => {
            console.error("Error retrieving data:", error);
          });

        let available_workers = [];
        for (const worker of paranet_workers) {
          query = `select txn_id,progress,approver,blockchain,asset_data,epochs,updated_at,created_at,ual FROM asset_header WHERE approver = ? AND blockchain = ? order by updated_at DESC LIMIT 5`;
          params = [worker.public_key, blockchain.name];
          last_processed = await queryDB
            .getData(query, params)
            .then((results) => {
              //console.log('Query results:', results);
              return results;
              // Use the results in your variable or perform further operations
            })
            .catch((error) => {
              console.error("Error retrieving data:", error);
            });


          if (Number(last_processed.length) === 0) {
            available_workers.push(worker);
            continue;
          }

          let updatedAtTimestamp = last_processed[0].updated_at;
          let currentTimestamp = new Date();
          let timeDifference = currentTimestamp - updatedAtTimestamp;

          //create nhung up and never happened
          if (
            last_processed[0].progress === "PROCESSING" &&
            timeDifference >= 600000
          ) {
            console.log(
              `${worker.name} wallet ${worker.public_key}: Processing for over 10 minutes. Rolling back to pending...`
            );
            query = `UPDATE asset_header SET progress = ?, approver = ? WHERE approver = ? AND progress = ? and blockchain = ?`;
            params = ["PENDING", null, worker.public_key, "PROCESSING", blockchain.name];
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

              paranet_workers.push(worker);
            continue;
          }

          //not processing, not transfering, not retrying transfer
          if (
            last_processed[0].progress !== "PROCESSING" &&
            last_processed[0].progress !== "CREATED"
          ) {
            available_workers.push(worker);
          }
        }

        console.log(
          `${blockchain.name} has ${available_workers.length} available wallets.`
        );

        if (Number(available_workers.length) === 0) {
          continue;
        }

        if (Number(request.length) === 0) {
          console.log(`${blockchain.name} has no pending requests.`);
        } else {
          request[0].approver = available_workers[0].public_key;
          pending_requests.push(request[0]);
        }
      }

      return pending_requests;
    } catch (error) {
      throw new Error("Error fetching pending requests: " + error.message);
    }
  },
};
