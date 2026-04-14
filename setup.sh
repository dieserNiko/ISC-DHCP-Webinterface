#!/bin/bash

# DHCP Web Admin Setup Script for Ubuntu 24.04
set -e

echo "Updating system..."
sudo apt-get update

echo "Installing Node.js and build dependencies..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs libpam0g-dev build-essential isc-dhcp-server

echo "Installing project dependencies..."
npm install

echo "Building frontend (Vite)..."
# In a real environment, we would run 'npm run build' in the client folder
# For this simple setup, we'll assume the user might want to run it in dev mode or we provide a build.

echo "Setup complete."
echo "------------------------------------------------"
echo "To start the server, run: node server.js"
echo "Make sure to set environment variables if needed:"
echo "export DHCP_CONF_PATH=/etc/dhcp/dhcpd.conf"
echo "export DHCP_LEASE_PATH=/var/lib/dhcp/dhcpd.leases"
echo "------------------------------------------------"
