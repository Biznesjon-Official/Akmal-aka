#!/bin/bash

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Loyihani O'rnatish Boshlandi"
echo "========================================"
echo ""

# Node.js versiyasini tekshirish
echo -e "${BLUE}[1/6] Node.js versiyasini tekshirish...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ XATO: Node.js o'rnatilmagan!${NC}"
    echo "Node.js'ni o'rnating: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js topildi${NC}"
node --version
echo ""

# Backend dependencies o'rnatish
echo -e "${BLUE}[2/6] Backend dependencies o'rnatilmoqda...${NC}"
cd server
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend dependencies o'rnatishda xatolik!${NC}"
        cd ..
        exit 1
    fi
else
    echo -e "${GREEN}✅ Backend dependencies allaqachon o'rnatilgan${NC}"
fi
echo -e "${GREEN}✅ Backend dependencies o'rnatildi${NC}"
echo ""

# Backend .env faylini yaratish
echo -e "${BLUE}[3/6] Backend .env faylini sozlash...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env fayl yaratildi${NC}"
    echo -e "${YELLOW}⚠️  DIQQAT: .env faylini tahrirlang va sozlamalarni kiriting!${NC}"
else
    echo -e "${GREEN}✅ .env fayl mavjud${NC}"
fi
cd ..
echo ""

# Frontend dependencies o'rnatish
echo -e "${BLUE}[4/6] Frontend dependencies o'rnatilmoqda...${NC}"
cd client
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend dependencies o'rnatishda xatolik!${NC}"
        cd ..
        exit 1
    fi
else
    echo -e "${GREEN}✅ Frontend dependencies allaqachon o'rnatilgan${NC}"
fi
echo -e "${GREEN}✅ Frontend dependencies o'rnatildi${NC}"
echo ""

# Frontend .env.local faylini yaratish
echo -e "${BLUE}[5/6] Frontend .env.local faylini sozlash...${NC}"
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✅ .env.local fayl yaratildi${NC}"
else
    echo -e "${GREEN}✅ .env.local fayl mavjud${NC}"
fi
cd ..
echo ""

# Yakuniy xabar
echo -e "${BLUE}[6/6] O'rnatish yakunlandi!${NC}"
echo ""
echo "========================================"
echo -e "${GREEN}  ✅ O'RNATISH MUVAFFAQIYATLI YAKUNLANDI${NC}"
echo "========================================"
echo ""
echo "Keyingi qadamlar:"
echo ""
echo "1. MongoDB'ni ishga tushiring"
echo "   - Local: MongoDB servisi ishga tushirilgan bo'lishi kerak"
echo "   - Cloud: MongoDB Atlas connection string'ni .env ga kiriting"
echo ""
echo "2. server/.env faylini tahrirlang:"
echo "   - MONGODB_URI ni to'ldiring"
echo "   - JWT_SECRET ni o'zgartiring"
echo ""
echo "3. Backend'ni ishga tushiring:"
echo "   cd server"
echo "   npm start"
echo ""
echo "4. Yangi terminal oching va Frontend'ni ishga tushiring:"
echo "   cd client"
echo "   npm run dev"
echo ""
echo "5. Brauzerda oching: http://localhost:3000"
echo ""
echo "6. Birinchi admin yarating va tizimga kiring"
echo ""
echo "========================================"
echo ""
