const paranet_miner_db = require("../database/paranet_miner_db");

module.exports = executeQuery = async (query, params) => {
  return new Promise(async (resolve, reject) => {
    await paranet_miner_db.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};
