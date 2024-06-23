#!/bin/bash

# Function to install dependencies
install_dependencies() {
    echo "Updating package list..."
    sudo apt-get update

    echo "Installing Node.js..."
    curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    echo "Installing MySQL..."
    sudo apt-get install -y mysql-server

    echo "Installing jq..."
    sudo apt-get install -y jq
}

# Function to clone repository and install Node.js packages
setup_repository() {
    echo "Installing Node.js packages..."
    npm install
}

# Function to configure and start MySQL
setup_mysql() {
    echo "Configuring MySQL..."

    # Prompt for MySQL credentials if needed
    read -p "Enter MySQL username (default is root): " mysql_user
    mysql_user=${mysql_user:-root}

    read -s -p "Enter MySQL password for $mysql_user: " mysql_password

    # Start MySQL service
    sudo service mysql start

    # Execute MySQL commands using provided credentials
    if [[ -n "$mysql_password" ]]; then
        mysql_cmd="sudo mysql -p$mysql_password -e"
    else
        mysql_cmd="sudo mysql -u $mysql_user -e"
    fi

    # Run SQL commands to set up database and user
    $mysql_cmd "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'admin';"
    $mysql_cmd "CREATE DATABASE IF NOT EXISTS paranet_miner;"
    $mysql_cmd "CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'admin';"
    $mysql_cmd "GRANT ALL PRIVILEGES ON paranet_miner.* TO 'admin'@'localhost';"
    $mysql_cmd "FLUSH PRIVILEGES;"

    echo "Creating asset_header table..."
    $mysql_cmd "USE paranet_miner; CREATE TABLE IF NOT EXISTS asset_header (
        txn_id VARCHAR(255) NOT NULL,
        progress TEXT NOT NULL,
        approver VARCHAR(255),
        blockchain VARCHAR(255),
        asset_data TEXT,
        ual VARCHAR(255),
        epochs INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (txn_id)
    );"
}


# Function to prompt user for .miner_config configuration
configure_miner_config() {
    echo "Creating .miner_config file from example_miner_config.json..."

    # Read the example config
    example_config=$(<example_miner_config.json)

    # Prompt for environment
    while true; do
        read -p "Select environment (testnet/mainnet): " environment
        if [[ "$environment" == "testnet" || "$environment" == "mainnet" ]]; then
            break
        else
            echo "Invalid selection. Please choose either 'testnet' or 'mainnet'."
        fi
    done

    # Prompt for DKG blockchain based on environment
    dkg_blockchain=""
    if [[ "$environment" == "testnet" ]]; then
        echo "Select DKG blockchain for testnet:"
        echo "1) Holesky"
        echo "2) Chiado"
        echo "3) NeuroWeb Testnet"
        echo "4) Base Testnet"
        read -p "Enter the number of your choice: " choice
        case $choice in
            1)
                dkg_blockchain="ethereum:17000"
                ;;
            2)
                dkg_blockchain="gnosis:10200"
                ;;
            3)
                dkg_blockchain="otp:20430"
                ;;
            4)
                dkg_blockchain="base:84531"
                ;;
            *)
                echo "Invalid choice"
                exit 1
                ;;
        esac
    else
        echo "Select DKG blockchain for mainnet:"
        echo "1) Ethereum"
        echo "2) Gnosis"
        echo "3) NeuroWeb Mainnet"
        echo "4) Base Mainnet"
        read -p "Enter the number of your choice: " choice
        case $choice in
            1)
                dkg_blockchain="ethereum:1"
                ;;
            2)
                dkg_blockchain="gnosis:100"
                ;;
            3)
                dkg_blockchain="otp:2043"
                ;;
            4)
                dkg_blockchain="base:8453"
                ;;
            *)
                echo "Invalid choice"
                exit 1
                ;;
        esac
    fi

    # Prompt for worker information
    paranet_workers=()
    while true; do
        read -p "Enter your public key (or press enter to finish): " public_key
        if [[ -z "$public_key" ]]; then
            break
        fi

        read -p "Enter your private key: " private_key
        if [[ -z "$private_key" ]]; then
            echo "Private key cannot be empty."
            continue
        fi

        index=$((${#paranet_workers[@]} + 1))
        paranet_workers+=("{\"name\":\"ParanetWorker$index\", \"publicKey\":\"$public_key\", \"privateKey\":\"$private_key\"}")
    done

    paranet_workers_str=$(IFS=,; echo "[${paranet_workers[*]}]")

    # Update the example config with user-provided values
    miner_config=$(jq --argjson workers "$paranet_workers_str" --arg environment "$environment" --arg dkg_blockchain "$dkg_blockchain" \
                    '.PARANET_WORKERS = $workers | .BLOCKCHAIN_ENVIRONMENT = $environment | .DKG_BLOCKCHAIN = $dkg_blockchain' <<< "$example_config")

    # Save the updated config to .miner_config
    sudo mkdir -p config
    echo "$miner_config" > config/.miner_config
}

# Function to set up the knowledger-processor service
setup_processor_service() {
    echo "Setting up knowledger-processor as a service..."

    sudo chmod +x knowledger-processor.sh
    sudo cp knowledger-processor.service /etc/systemd/system/
    sudo systemctl enable knowledger-processor
    sudo systemctl start knowledger-processor
}

# Function to set up the knowledger-miner service
setup_builder_service() {
    echo "Setting up knowledger-builder as a service..."

    sudo chmod +x knowledger-builder.sh
    sudo cp knowledger-builder.service /etc/systemd/system/
    sudo systemctl enable knowledger-builder
    sudo systemctl start knowledger-builder
}

# Main function to call all other functions
main() {
    install_dependencies
    setup_repository
    setup_mysql
    configure_miner_config
    setup_processor_service
    setup_builder_service

    echo "Installation and setup complete!"
}

# Execute main function
main
