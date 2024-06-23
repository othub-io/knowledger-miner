#!/bin/bash

# Change to the directory containing your Node.js application
cd ~/knowledger-miner/src/builder

# Start the application using nodemon and log output
while true
do
    nodemon start >> /var/log/knowledger-builder.log 2>&1
    sleep 1
done
