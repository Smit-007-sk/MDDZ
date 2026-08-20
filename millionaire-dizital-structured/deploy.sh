#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "==============================================="
echo "   STARTING DEPLOYMENT FOR MDZ-DEVELOP"
echo "==============================================="

TARGET_DIR="/vps/mdz-develop"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory $TARGET_DIR does not exist."
    echo "Please clone the repository first: "
    echo "git clone https://github.com/Smit-007-sk/MDDZ.git $TARGET_DIR"
    exit 1
fi

cd "$TARGET_DIR"

echo "1. Fetching latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "2. Securing file permissions..."
# Detect default Nginx user (www-data for Ubuntu/Debian, nginx for CentOS/RHEL)
NGINX_USER="nginx"
if id "www-data" &>/dev/null; then
    NGINX_USER="www-data"
fi

echo "Setting owner to $NGINX_USER..."
chown -R $NGINX_USER:$NGINX_USER "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"

echo "3. Testing and reloading Nginx configuration..."
nginx -t
systemctl reload nginx || nginx -s reload

echo "==============================================="
echo "   DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "==============================================="
