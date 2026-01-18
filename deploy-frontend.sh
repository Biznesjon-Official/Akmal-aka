#!/bin/bash

# Frontend deployment script for VPS
# Usage: bash deploy-frontend.sh

set -e

echo "🚀 Starting frontend deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/root/export"
CLIENT_DIR="$PROJECT_DIR/client"

echo -e "${YELLOW}📁 Navigating to project directory...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git pull origin main || git pull origin master

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd $CLIENT_DIR
npm install

echo -e "${YELLOW}🧹 Cleaning old build files...${NC}"
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

echo -e "${YELLOW}🔨 Building production bundle...${NC}"
npm run build

echo -e "${YELLOW}🔄 Restarting PM2 processes...${NC}"
cd $PROJECT_DIR
pm2 restart ecosystem.config.js --only akmal-aka-frontend
pm2 save

echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 status

echo -e "${GREEN}✅ Frontend deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Site: https://akmalaka.biznejon.uz${NC}"

# Show logs
echo -e "${YELLOW}📋 Recent logs:${NC}"
pm2 logs akmal-aka-frontend --lines 20 --nostream
