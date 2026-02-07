#!/bin/bash

# SSL Certificate setup with Let's Encrypt
# Usage: bash setup-ssl.sh

set -e

echo "🔒 Setting up SSL certificate with Let's Encrypt..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="akmalaka.biznesjon.uz"
EMAIL="admin@biznesjon.uz"  # Change this to your email

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo bash setup-ssl.sh)${NC}"
    exit 1
fi

# Install certbot
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
apt update
apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
echo -e "${YELLOW}⏹️ Stopping Nginx temporarily...${NC}"
systemctl stop nginx

# Obtain SSL certificate
echo -e "${YELLOW}🔒 Obtaining SSL certificate for $DOMAIN...${NC}"
certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Update Nginx configuration for SSL
echo -e "${YELLOW}🌐 Updating Nginx configuration for SSL...${NC}"
cat > /etc/nginx/sites-available/akmalaka << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name akmalaka.biznesjon.uz;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name akmalaka.biznesjon.uz;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/akmalaka.biznesjon.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/akmalaka.biznesjon.uz/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Next.js static files - long cache
    location /_next/static {
        proxy_pass http://localhost:3010;
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 1y;
    }

    # Next.js dynamic files
    location /_next {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API endpoints with rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:5010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Other API endpoints
    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Frontend - all other requests
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    # Logs
    access_log /var/log/nginx/akmalaka_access.log;
    error_log /var/log/nginx/akmalaka_error.log;
}
EOF

# Test nginx configuration
nginx -t

# Start nginx
echo -e "${YELLOW}🚀 Starting Nginx...${NC}"
systemctl start nginx

# Setup automatic renewal
echo -e "${YELLOW}🔄 Setting up automatic SSL renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# Update frontend environment for HTTPS
echo -e "${YELLOW}⚙️ Updating frontend environment for HTTPS...${NC}"
cat > /root/export/client/.env.local << EOF
# Production Environment with HTTPS
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://akmalaka.biznesjon.uz/api
EOF

# Update backend environment for HTTPS
echo -e "${YELLOW}⚙️ Updating backend CORS for HTTPS...${NC}"
sed -i 's|CLIENT_URL=.*|CLIENT_URL=https://akmalaka.biznesjon.uz|' /root/export/server/.env
sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://akmalaka.biznesjon.uz|' /root/export/server/.env

# Restart applications
echo -e "${YELLOW}🔄 Restarting applications...${NC}"
cd /root/export
pm2 restart all

echo ""
echo -e "${GREEN}🎉 SSL setup completed!${NC}"
echo "=================================="
echo -e "${BLUE}📋 SSL Information:${NC}"
echo "- Domain: $DOMAIN"
echo "- Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "- Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "- Auto-renewal: Configured (runs daily at 12:00)"
echo ""
echo -e "${BLUE}🔒 Security Features Enabled:${NC}"
echo "- HTTPS redirect (HTTP → HTTPS)"
echo "- TLS 1.2 and 1.3 support"
echo "- HSTS (HTTP Strict Transport Security)"
echo "- Security headers (XSS, CSRF protection)"
echo "- Rate limiting (API and login endpoints)"
echo ""
echo -e "${GREEN}✅ Your site is now secure: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}📋 Certificate Management:${NC}"
echo "- Check certificate: certbot certificates"
echo "- Renew manually: certbot renew"
echo "- Test renewal: certbot renew --dry-run"