const queryDB = require("./queryDB");

const queryTypes = [
  {
    name: "queryDB",
    getData: (query, params) => queryDB(query, params),
  }
];

module.exports = {
  queryDB: function queryDB() {
    return queryTypes[0];
  }
};
