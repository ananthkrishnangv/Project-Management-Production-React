#!/bin/bash
# ==============================================================================
# CSIR-SERC Project Management Portal - Production Server Deployment Script
# Server: 10.10.200.36
# Path: /opt/csir-serc-portal
# ==============================================================================

set -e

echo "🚀 Starting CSIR-SERC Project Management Portal Deployment..."

APP_DIR="/opt/csir-serc-portal"
cd "$APP_DIR"

echo "📥 1. Pulling latest codebase from repository..."
git pull origin main

echo "📦 2. Upgrading backend dependencies & Prisma Client..."
cd "$APP_DIR/backend"
npm install --ignore-scripts
npx prisma generate
npm run build

echo "🎨 3. Building frontend production assets..."
cd "$APP_DIR/frontend"
npm install --ignore-scripts
npm run build

echo "🔄 4. Restarting PM2 backend service..."
pm2 restart csir-serc-portal || pm2 start dist/index.js --name "csir-serc-portal"

echo "🌐 5. Reloading Nginx configuration..."
nginx -t && systemctl reload nginx || service nginx reload

echo "✅ Deployment completed successfully on 10.10.200.36!"
pm2 status csir-serc-portal
