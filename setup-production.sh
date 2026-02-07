#!/bin/bash

# Production setup script for Akmal Aka Import/Export System
# Usage: bash setup-production.sh

set -e

echo "🚀 Setting up production environment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/root/export"
NGINX_CONF="/etc/nginx/sites-available/akmalaka"
NGINX_ENABLED="/etc/nginx/sites-enabled/akmalaka"

echo -e "${BLUE}📋 Production Setup Checklist${NC}"
echo "=================================="

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo bash setup-production.sh)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running as root${NC}"

# 2. Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# 3. Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
apt install -y nginx nodejs npm mongodb-tools curl git

# 4. Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2...${NC}"
npm install -g pm2

# 5. Create project directory
echo -e "${YELLOW}📁 Creating project directory...${NC}"
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/logs

# 6. Setup Nginx
echo -e "${YELLOW}🌐 Setting up Nginx...${NC}"
cp $PROJECT_DIR/nginx-akmalaka.conf $NGINX_CONF
ln -sf $NGINX_CONF $NGINX_ENABLED

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# 7. Setup environment files
echo -e "${YELLOW}⚙️ Setting up environment files...${NC}"

# Backend .env
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
    echo -e "${YELLOW}📝 Creating backend .env file...${NC}"
    cat > $PROJECT_DIR/server/.env << EOF
# Production Environment
NODE_ENV=production
PORT=5010

# MongoDB (UPDATE WITH YOUR MONGODB URI)
MONGODB_URI=mongodb://localhost:27017/akmalaka_production

# JWT Secret (CHANGE THIS!)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# CORS Settings
CLIENT_URL=https://akmalaka.biznesjon.uz
ALLOWED_ORIGINS=https://akmalaka.biznesjon.uz,http://akmalaka.biznesjon.uz

# Backup Directory
BACKUP_DIR=/var/backups/akmalaka

# Exchange Rate API (optional)
EXCHANGE_API_KEY=

# Logging
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✅ Backend .env created${NC}"
else
    echo -e "${BLUE}ℹ️ Backend .env already exists${NC}"
fi

# Frontend .env.local
if [ ! -f "$PROJECT_DIR/client/.env.local" ]; then
    echo -e "${YELLOW}📝 Creating frontend .env.local file...${NC}"
    cat > $PROJECT_DIR/client/.env.local << EOF
# Production Environment
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://akmalaka.biznesjon.uz/api
EOF
    echo -e "${GREEN}✅ Frontend .env.local created${NC}"
else
    echo -e "${BLUE}ℹ️ Frontend .env.local already exists${NC}"
fi

# 8. Install dependencies and build
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd $PROJECT_DIR

# Backend
cd server
npm install --production
cd ..

# Frontend
cd client
npm install
npm run build
cd ..

# 9. Setup PM2
echo -e "${YELLOW}🔄 Setting up PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 10. Setup firewall (optional)
echo -e "${YELLOW}🔥 Setting up firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# 11. Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
systemctl enable nginx
systemctl restart nginx
pm2 restart all

# 12. Setup log rotation
echo -e "${YELLOW}📋 Setting up log rotation...${NC}"
cat > /etc/logrotate.d/akmalaka << EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 13. Create backup directory
mkdir -p /var/backups/akmalaka
chown -R root:root /var/backups/akmalaka

echo ""
echo -e "${GREEN}🎉 Production setup completed!${NC}"
echo "=================================="
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update MongoDB URI in server/.env"
echo "2. Configure SSL certificate (Let's Encrypt recommended)"
echo "3. Update DNS records to point to this server"
echo "4. Test the application: http://akmalaka.biznesjon.uz"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo "- Check PM2 status: pm2 status"
echo "- View logs: pm2 logs"
echo "- Restart apps: pm2 restart all"
echo "- Check Nginx: systemctl status nginx"
echo "- View Nginx logs: tail -f /var/log/nginx/akmalaka_*.log"
echo ""
echo -e "${YELLOW}⚠️ Security Reminders:${NC}"
echo "- Change default MongoDB credentials"
echo "- Setup SSL certificate"
echo "- Configure regular backups"
echo "- Monitor system resources"
echo ""
echo -e "${GREEN}✅ System is ready for production!${NC}"