#!/bin/bash

# Function to install dependencies
install_dependencies() {
    echo "Updating package list..."
    sudo apt-get update

    echo "Installing Node.js..."
    curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    echo "Installing MySQL..."
    sudo apt-get install -y mysql-server

    echo "Installing jq..."
    sudo apt-get install -y jq

    echo "Installing nodemon globally..."
    sudo npm install -g nodemon
}

# Function to clone repository and install Node.js packages
setup_repository() {
    echo "Installing Node.js packages..."
    npm install
}

# Function to configure and start MySQL
setup_mysql() {
    echo "Configuring MySQL..."

    # Start MySQL service
    sudo service mysql start

    # Prompt for MySQL credentials if needed
    read -p "Enter MySQL username (default is root): " mysql_user
    mysql_user=${mysql_user:-root}

    read -s -p "Enter MySQL password for $mysql_user: " mysql_password

    # Execute MySQL commands using provided credentials
    if [[ -n "$mysql_password" ]]; then
        mysql_cmd="sudo mysql -p$mysql_password -e"
    else
        mysql_cmd="sudo mysql -u $mysql_user -e"
    fi

    # Update MySQL user authentication method
    $mysql_cmd "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'admin';"
    $mysql_cmd "FLUSH PRIVILEGES;"
}

# Function to set up MySQL authentication plugin in configuration file
setup_mysql_auth_plugin() {
    echo "Updating MySQL authentication plugin..."

    # Edit MySQL configuration to set default authentication plugin
    sudo sed -i '/^\[mysqld\]$/a default_authentication_plugin=mysql_native_password' /etc/mysql/mysql.conf.d/mysqld.cnf

    # Restart MySQL service to apply changes
    sudo service mysql restart
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
    setup_mysql_auth_plugin
    configure_miner_config
    setup_processor_service
    setup_builder_service

    echo "Installation and setup complete!"
}

# Execute main function
main
