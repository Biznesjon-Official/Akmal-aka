@echo off
echo ========================================
echo   Loyihani O'rnatish Boshlandi
echo ========================================
echo.

REM Node.js versiyasini tekshirish
echo [1/6] Node.js versiyasini tekshirish...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ XATO: Node.js o'rnatilmagan!
    echo Node.js'ni o'rnating: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js topildi
node --version
echo.

REM Backend dependencies o'rnatish
echo [2/6] Backend dependencies o'rnatilmoqda...
cd server
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo ❌ Backend dependencies o'rnatishda xatolik!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo ✅ Backend dependencies allaqachon o'rnatilgan
)
echo ✅ Backend dependencies o'rnatildi
echo.

REM Backend .env faylini yaratish
echo [3/6] Backend .env faylini sozlash...
if not exist ".env" (
    copy .env.example .env >nul
    echo ✅ .env fayl yaratildi
    echo ⚠️  DIQQAT: .env faylini tahrirlang va sozlamalarni kiriting!
) else (
    echo ✅ .env fayl mavjud
)
cd ..
echo.

REM Frontend dependencies o'rnatish
echo [4/6] Frontend dependencies o'rnatilmoqda...
cd client
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo ❌ Frontend dependencies o'rnatishda xatolik!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo ✅ Frontend dependencies allaqachon o'rnatilgan
)
echo ✅ Frontend dependencies o'rnatildi
echo.

REM Frontend .env.local faylini yaratish
echo [5/6] Frontend .env.local faylini sozlash...
if not exist ".env.local" (
    copy .env.example .env.local >nul
    echo ✅ .env.local fayl yaratildi
) else (
    echo ✅ .env.local fayl mavjud
)
cd ..
echo.

REM Yakuniy xabar
echo [6/6] O'rnatish yakunlandi!
echo.
echo ========================================
echo   ✅ O'RNATISH MUVAFFAQIYATLI YAKUNLANDI
echo ========================================
echo.
echo Keyingi qadamlar:
echo.
echo 1. MongoDB'ni ishga tushiring
echo    - Local: MongoDB servisi ishga tushirilgan bo'lishi kerak
echo    - Cloud: MongoDB Atlas connection string'ni .env ga kiriting
echo.
echo 2. server/.env faylini tahrirlang:
echo    - MONGODB_URI ni to'ldiring
echo    - JWT_SECRET ni o'zgartiring
echo.
echo 3. Backend'ni ishga tushiring:
echo    cd server
echo    npm start
echo.
echo 4. Yangi terminal oching va Frontend'ni ishga tushiring:
echo    cd client
echo    npm run dev
echo.
echo 5. Brauzerda oching: http://localhost:3000
echo.
echo 6. Birinchi admin yarating va tizimga kiring
echo.
echo ========================================
echo.
pause
