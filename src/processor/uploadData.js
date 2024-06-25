const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config/.miner_config');
const miner_config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const queryTypes = require("../../util/queryTypes.js");
const queryDB = queryTypes.queryDB();
const DKGClient = require("dkg.js");
const handleErrors = require("./handleErrors.js");
const paranet_testnet_host = miner_config.paranet_testnet_host
const paranet_mainnet_host = miner_config.paranet_mainnet_host
const paranet_testnet_port = miner_config.paranet_testnet_port
const paranet_mainnet_port = miner_config.paranet_mainnet_port
const paranet_workers = miner_config.paranet_workers
const environment = miner_config.environment
const visibility = miner_config.visibility
const max_trac_cost = miner_config.max_trac_cost

const testnet_node_options = {
  endpoint: paranet_testnet_host,
  port: paranet_testnet_port,
  useSSL: true,
  maxNumberOfRetries: 100,
};

const mainnet_node_options = {
  endpoint: paranet_mainnet_host,
  port: paranet_mainnet_port,
  useSSL: true,
  maxNumberOfRetries: 100,
};

const testnet_dkg = new DKGClient(testnet_node_options);
const mainnet_dkg = new DKGClient(mainnet_node_options);

module.exports = {
  uploadData: async function uploadData(data) {
    try {
      let index = paranet_workers.findIndex(
        (obj) => obj.public_key == data.approver
      );

      let query = `UPDATE asset_header SET progress = ?, approver = ? WHERE txn_id = ?`;
      let params = ["PROCESSING", data.approver, data.txn_id];
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

      console.log(
        `${paranet_workers[index].name} wallet ${paranet_workers[index].public_key}: Creating next asset on ${data.blockchain}.`
      );

      if (
        (data.blockchain === "otp:20430" ||
          data.blockchain === "gnosis:10200") &&
          !environment === "testnet"
      ) {
        throw new Error(`Found asset for ${data.blockchain} in ${environment} environment`);
      }

      if (
        (data.blockchain === "otp:2043" || data.blockchain === "gnosis:100") &&
        !environment === "mainnet"
      ) {
        throw new Error(`Found asset for ${data.blockchain} in ${environment} environment`);
      }

      let dkg = testnet_dkg;
      if (environment === "mainnet") {
        dkg = mainnet_dkg;
      }

      let data_obj;
      if (visibility === "private") {
        data_obj = {
          "private": JSON.parse(data.asset_data)
        };
      } else {
        data_obj = {
          "public": JSON.parse(data.asset_data)
        };
      }

      const publicAssertionId = await dkg.assertion.getPublicAssertionId(data_obj);
      const publicAssertionSize = await dkg.assertion.getSizeInBytes(data_obj);
      
      const bid_suggestion = await dkg.network.getBidSuggestion(
        publicAssertionId,
        publicAssertionSize,
        {
          epochsNum: data.epochs,
          environment: environment,
          blockchain: {
            name: data.blockchain,
            publicKey: paranet_workers[index].public_key,
            privateKey: paranet_workers[index].private_key,
          },
          bidSuggestionRange: "low",
        }
      );

      let asset_cost = Number(bid_suggestion.data) / 1e18
      if (
        asset_cost >
        Number(max_trac_cost)
      ) {
        throw new Error(`Asset cost ${asset_cost} is greater than maximum allowed cost ${max_trac_cost}.`);
      }

      let dkg_create_result = await dkg.asset
        .create(data_obj, {
          environment: environment,
          epochsNum: data.epochs,
          maxNumberOfRetries: 30,
          frequency: 2,
          contentType: "all",
          keywords: `${data.blockchain}, knowledger-miner`,
          blockchain: {
            name: data.blockchain,
            publicKey: paranet_workers[index].public_key,
            privateKey: paranet_workers[index].private_key,
            handleNotMinedError: true,
          },
        })
        .then((result) => {
          return result;
        })
        .catch(async (error) => {
          console.log(error)
          error_obj = {
            error: error.message,
            index: index,
            blockchain: data.blockchain,
            request: "RETRY-CREATE",
            epochs: data.epochs,
            asset_data: data.asset_data,
          };
          throw new Error(JSON.stringify(error_obj));
        });

      query = `UPDATE asset_header SET progress = ?, ual = ? WHERE txn_id = ?`;
      params = ["CREATED", dkg_create_result.UAL, data.txn_id];
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

      console.log(
        `${paranet_workers[index].name} wallet ${paranet_workers[index].public_key}: Created UAL ${dkg_create_result.UAL}.`
      );
      return;
    } catch (error) {
      console.log(error)
      let message = JSON.parse(error.message);
      await handleErrors.handleError(message);
    }
  },
};
