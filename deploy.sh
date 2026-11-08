#!/bin/bash
set -e

echo "========================================="
echo "🍞 Deploying Harbuu Bakery Application"
echo "========================================="

APP_DIR="/opt/bakery"
REPO_URL="https://github.com/soneschool1/Bakery.git"

# Create directory if it does not exist
if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
else
    echo "Pulling latest code..."
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
fi

# Ensure .env exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Creating .env configuration..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

# Allow firewall ports
echo "Configuring firewall..."
ufw allow 8088/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

# Build and start Docker containers
echo "Starting Docker containers..."
docker compose pull || true
docker compose up -d --build --remove-orphans

echo "Checking container status..."
docker compose ps

echo "Waiting for healthchecks..."
sleep 5
docker compose ps

echo "========================================="
echo "✅ Harbuu Bakery deployed successfully!"
echo "Access via: http://82.29.173.85:8088"
echo "========================================="
