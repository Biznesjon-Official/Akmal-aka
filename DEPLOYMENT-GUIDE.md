# VPS Deployment Guide

## Muammo: 500 Internal Server Error

Agar sayt 500 xatosini ko'rsatsa, quyidagi qadamlarni bajaring:

### 1. Tezkor Yechim (Quick Fix)

VPS ga SSH orqali kiring va quyidagi buyruqlarni bajaring:

```bash
# 1. Project papkasiga o'ting
cd /root/export

# 2. Git dan yangilanishlarni oling
git pull

# 3. Client papkasiga o'ting
cd client

# 4. Eski build fayllarini o'chiring
rm -rf .next
rm -rf node_modules/.cache

# 5. Dependencies ni yangilang (agar kerak bo'lsa)
npm install

# 6. Production build qiling
npm run build

# 7. PM2 ni restart qiling
cd ..
pm2 restart akmal-aka-frontend

# 8. Statusni tekshiring
pm2 status
pm2 logs akmal-aka-frontend --lines 50
```

### 2. Avtomatik Deployment Script

Deployment scriptni ishlatish:

```bash
cd /root/export
bash deploy-frontend.sh
```

Yoki tezkor versiya:

```bash
cd /root/export
bash quick-deploy.sh
```

### 3. Agar Muammo Davom Etsa

#### A. PM2 ni to'liq restart qiling

```bash
pm2 delete akmal-aka-frontend
pm2 start ecosystem.config.js --only akmal-aka-frontend
pm2 save
```

#### B. Node.js cache ni tozalang

```bash
cd /root/export/client
rm -rf node_modules
npm cache clean --force
npm install
npm run build
```

#### C. Nginx ni restart qiling

```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### D. Loglarni tekshiring

```bash
# PM2 logs
pm2 logs akmal-aka-frontend --lines 100

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### 4. Keng Tarqalgan Muammolar

#### Muammo: Port band
```bash
# Port 3001 ni tekshiring
sudo lsof -i :3001

# Agar kerak bo'lsa, process ni to'xtating
sudo kill -9 <PID>
```

#### Muammo: Disk to'lgan
```bash
# Disk joyini tekshiring
df -h

# Eski loglarni tozalang
pm2 flush
sudo journalctl --vacuum-time=7d
```

#### Muammo: Memory to'lgan
```bash
# Memory ni tekshiring
free -h

# PM2 ni restart qiling
pm2 restart all
```

### 5. Environment Variables

`.env.local` faylini tekshiring:

```bash
cd /root/export/client
cat .env.local
```

Kerakli o'zgaruvchilar:
```
NEXT_PUBLIC_API_URL=https://akmalaka.biznejon.uz
```

### 6. Nginx Konfiguratsiya

Nginx konfiguratsiyasini tekshiring:

```bash
sudo nano /etc/nginx/sites-available/akmalaka.conf
```

Kerakli sozlamalar:
```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /_next/static {
    proxy_pass http://localhost:3001/_next/static;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, immutable";
}
```

### 7. PM2 Ecosystem Config

`ecosystem.config.js` ni tekshiring:

```javascript
{
  name: 'akmal-aka-frontend',
  script: 'npm',
  args: 'start',
  cwd: './client',
  instances: 1,
  exec_mode: 'fork',
  env: {
    NODE_ENV: 'production',
    PORT: 3001
  }
}
```

### 8. Health Check

Sayt ishlayotganini tekshirish:

```bash
# Frontend
curl http://localhost:3001

# Backend
curl http://localhost:5002/api/health

# Nginx
curl https://akmalaka.biznejon.uz
```

### 9. Monitoring

PM2 monitoring:

```bash
# Real-time monitoring
pm2 monit

# Status
pm2 status

# Logs
pm2 logs

# Restart count
pm2 info akmal-aka-frontend
```

### 10. Backup va Rollback

Agar yangi deployment ishlamasa:

```bash
# Git orqali oldingi versiyaga qaytish
cd /root/export
git log --oneline -10
git checkout <commit-hash>
bash quick-deploy.sh
```

## Qo'shimcha Yordam

Agar muammo hal bo'lmasa:

1. PM2 loglarini to'liq ko'ring: `pm2 logs akmal-aka-frontend --lines 200`
2. Nginx error loglarini tekshiring: `sudo tail -100 /var/log/nginx/error.log`
3. Browser console da xatolarni ko'ring (F12)
4. Network tab da failed requests ni tekshiring

## Foydali Buyruqlar

```bash
# PM2
pm2 list                    # Barcha processlar
pm2 restart all            # Hammasini restart
pm2 stop all               # Hammasini to'xtatish
pm2 delete all             # Hammasini o'chirish
pm2 save                   # Konfiguratsiyani saqlash
pm2 startup                # Auto-start sozlash

# Nginx
sudo nginx -t              # Konfiguratsiyani test qilish
sudo systemctl status nginx # Status
sudo systemctl restart nginx # Restart
sudo systemctl reload nginx  # Reload (downtime yo'q)

# Git
git status                 # O'zgarishlarni ko'rish
git pull                   # Yangilanishlarni olish
git log --oneline -10      # Oxirgi 10 ta commit

# System
df -h                      # Disk space
free -h                    # Memory
top                        # CPU va Memory usage
htop                       # Yaxshiroq monitoring
```
