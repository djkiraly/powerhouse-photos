#!/bin/bash
# Application Deployment Script
# Run this after initial setup to deploy updates
# Usage: bash deploy.sh

set -e

APP_DIR="/var/www/powerhouse-photos"

echo "=========================================="
echo "Deploying PowerhousePhotos"
echo "=========================================="

cd $APP_DIR

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo "[1/5] Pulling latest changes..."
    git pull origin main
else
    echo "[1/5] Skipping git pull (not a git repository)"
fi

# Install dependencies
echo "[2/5] Installing dependencies..."
npm ci --production=false

# Generate Prisma client
echo "[3/5] Generating Prisma client..."
npx prisma generate --config prisma/prisma.config.ts

# Build application
echo "[4/5] Building application..."
npm run build

# Restart PM2 processes
echo "[5/5] Restarting application..."
pm2 reload ecosystem.config.js --env production

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
pm2 status
