# 🖥 VPS Deployment Guide

## VPS'da Deploy Qilish (Ubuntu 22.04)

### 1️⃣ VPS Tayyorlash

#### VPS Xarid Qilish:
- **DigitalOcean**: $6/month (1GB RAM, 1 CPU)
- **Hetzner**: €4.5/month (2GB RAM, 1 CPU)
- **Linode**: $5/month (1GB RAM, 1 CPU)
- **Contabo**: €5/month (4GB RAM, 2 CPU)

#### Minimal Talablar:
- **RAM**: 2GB (tavsiya etiladi)
- **CPU**: 1 core
- **Disk**: 20GB
- **OS**: Ubuntu 22.04 LTS

---

## 2️⃣ VPS'ga Ulanish

### SSH orqali ulanish:
```bash
ssh root@your_vps_ip
```

Yoki SSH key bilan:
```bash
ssh -i ~/.ssh/id_rsa root@your_vps_ip
```

---

## 3️⃣ Server Sozlash

### 1. Tizimni Yangilash:
```bash
apt update && apt upgrade -y
```

### 2. Node.js O'rnatish (v20):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # v20.x.x
npm -v   # 10.x.x
```

### 3. Git O'rnatish:
```bash
apt install -y git
```

### 4. PM2 O'rnatish (Process Manager):
```bash
npm install -g pm2
```

### 5. Nginx O'rnatish (Reverse Proxy):
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 6. Firewall Sozlash:
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 4️⃣ Loyihani Clone Qilish

### 1. Loyiha Papkasini Yaratish:
```bash
mkdir -p /var/www
cd /var/www
```

### 2. GitHub'dan Clone:
```bash
git clone https://github.com/Javohir-ac/export.git
cd export
```

---

## 5️⃣ Backend Sozlash

### 1. Backend Papkasiga O'tish:
```bash
cd /var/www/export/server
```

### 2. Dependencies O'rnatish:
```bash
npm install
```

### 3. Environment Variables:
```bash
nano .env
```

Quyidagilarni kiriting:
```env
PORT=5002
MONGODB_URI=mongodb+srv://javohir111_db_user:K6gPXt0qZMGDK802@umumuy.rygkhns.mongodb.net/?appName=Umumuy
JWT_SECRET=wood_import_export_secret_key_2024_production_secure
NODE_ENV=production
CLIENT_URL=http://your_vps_ip:3000
```

**Ctrl+X**, **Y**, **Enter** (saqlash)

### 4. PM2 bilan Ishga Tushirish:
```bash
pm2 start index.js --name "export-backend"
pm2 save
pm2 startup
```

### 5. Backend Tekshirish:
```bash
curl http://localhost:5002/api/auth/check-admin
```

---

## 6️⃣ Frontend Sozlash

### 1. Frontend Papkasiga O'tish:
```bash
cd /var/www/export/client
```

### 2. Dependencies O'rnatish:
```bash
npm install
```

### 3. Environment Variables:
```bash
nano .env.local
```

Quyidagilarni kiriting:
```env
NEXT_PUBLIC_API_URL=http://your_vps_ip:5002
NODE_ENV=production
```

**Ctrl+X**, **Y**, **Enter**

### 4. Build Qilish:
```bash
npm run build
```

### 5. PM2 bilan Ishga Tushirish:
```bash
pm2 start npm --name "export-frontend" -- start
pm2 save
```

### 6. Frontend Tekshirish:
```bash
curl http://localhost:3000
```

---

## 7️⃣ Nginx Sozlash (Reverse Proxy)

### 1. Nginx Config Yaratish:
```bash
nano /etc/nginx/sites-available/export
```

Quyidagilarni kiriting:
```nginx
# Backend
server {
    listen 80;
    server_name api.yourdomain.com;  # yoki your_vps_ip

    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # yoki your_vps_ip

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Ctrl+X**, **Y**, **Enter**

### 2. Config'ni Faollashtirish:
```bash
ln -s /etc/nginx/sites-available/export /etc/nginx/sites-enabled/
nginx -t  # Test config
systemctl reload nginx
```

---

## 8️⃣ SSL Sertifikat (HTTPS)

### 1. Certbot O'rnatish:
```bash
apt install -y certbot python3-certbot-nginx
```

### 2. SSL Sertifikat Olish:
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 3. Avtomatik Yangilanish:
```bash
certbot renew --dry-run
```

---

## 9️⃣ PM2 Monitoring

### PM2 Commandlar:
```bash
pm2 list                    # Barcha processlar
pm2 logs export-backend     # Backend logs
pm2 logs export-frontend    # Frontend logs
pm2 restart export-backend  # Backend restart
pm2 restart export-frontend # Frontend restart
pm2 stop export-backend     # Backend stop
pm2 delete export-backend   # Backend delete
pm2 monit                   # Real-time monitoring
```

---

## 🔟 Yangilash (Update)

### 1. Yangi Kodlarni Pull Qilish:
```bash
cd /var/www/export
git pull origin master
```

### 2. Backend Yangilash:
```bash
cd server
npm install
pm2 restart export-backend
```

### 3. Frontend Yangilash:
```bash
cd ../client
npm install
npm run build
pm2 restart export-frontend
```

---

## 🔒 Xavfsizlik

### 1. Yangi User Yaratish (root ishlatmaslik):
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 2. SSH Key Authentication:
```bash
# Local kompyuterda:
ssh-keygen -t rsa -b 4096
ssh-copy-id deploy@your_vps_ip

# VPS'da:
nano /etc/ssh/sshd_config
# PasswordAuthentication no
systemctl restart sshd
```

### 3. Fail2ban O'rnatish:
```bash
apt install -y fail2ban
systemctl start fail2ban
systemctl enable fail2ban
```

---

## 📊 Monitoring

### 1. Disk Space:
```bash
df -h
```

### 2. Memory Usage:
```bash
free -h
```

### 3. CPU Usage:
```bash
top
```

### 4. Nginx Logs:
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔄 Backup

### 1. MongoDB Backup:
```bash
# MongoDB Atlas'da avtomatik backup bor
# Yoki manual backup:
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)
```

### 2. Code Backup:
```bash
cd /var/www
tar -czf export-backup-$(date +%Y%m%d).tar.gz export/
```

---

## 🐛 Muammolarni Hal Qilish

### Backend ishlamayapti:
```bash
pm2 logs export-backend
pm2 restart export-backend
```

### Frontend ishlamayapti:
```bash
pm2 logs export-frontend
pm2 restart export-frontend
```

### Nginx xatosi:
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Port band:
```bash
lsof -i :5002
lsof -i :3000
kill -9 <PID>
```

---

## 💰 Xarajatlar

### Minimal Setup:
- **VPS**: $5-6/month
- **Domain**: $10-15/year
- **SSL**: Bepul (Let's Encrypt)
- **Jami**: ~$6/month

### Tavsiya Etilgan:
- **VPS**: $12/month (2GB RAM)
- **Domain**: $10-15/year
- **Backup**: $2/month
- **Jami**: ~$14/month

---

## ✅ Tayyor!

**Frontend**: http://your_vps_ip yoki https://yourdomain.com  
**Backend**: http://your_vps_ip:5002 yoki https://api.yourdomain.com

---

## 📞 Yordam

VPS deploy qilishda muammo bo'lsa:
1. PM2 logs'ni tekshiring
2. Nginx logs'ni tekshiring
3. Firewall sozlamalarini tekshiring
4. MongoDB ulanishini tekshiring
