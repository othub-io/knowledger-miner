#!/bin/bash

# Change to the directory containing your Node.js application
cd ~/knowledger-miner/src/processor

# Start the application using nodemon and log output to stdout and stderr
while true
do
    nodemon start
    sleep 1
done
