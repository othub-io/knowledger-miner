const paranet_db = require("../database/paranet_db");

module.exports = executeQuery = async (query, params) => {
  return new Promise(async (resolve, reject) => {
    await paranet_db.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};
