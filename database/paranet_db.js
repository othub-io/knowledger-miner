const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../config/.miner_config');
const miner_config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const mysql = require('mysql')

const pool = mysql.createPool({
    host: miner_config.db_host,
    user: miner_config.db_user,
    password: miner_config.db_pass,
    database: miner_config.db_name,
    waitForConnections: true,
    connectionLimit: 1000, // Adjust this based on your requirements
    queueLimit: 0
})

module.exports = pool;