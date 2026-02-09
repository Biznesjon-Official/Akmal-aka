const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
require('dotenv').config();

// Services
// const exchangeRateService = require('./services/exchangeRateService'); // Temporarily disabled

const app = express();

// Trust proxy - Nginx orqali kelayotgan so'rovlar uchun
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Next.js uchun
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting - DDoS himoyasi
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 100, // Har bir IP uchun 100 ta request
  message: 'Juda ko\'p so\'rov yuborildi, iltimos keyinroq urinib ko\'ring',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login uchun maxsus rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 5, // 5 ta urinish
  message: 'Juda ko\'p login urinishi, 15 daqiqadan keyin qayta urinib ko\'ring',
  skipSuccessfulRequests: true
});

app.use('/api/', limiter);
app.use('/api/auth/login', loginLimiter);

// Performance monitoring middleware
// const { performanceMonitor } = require('./middleware/autoOptimization'); // Temporarily disabled
// app.use(performanceMonitor);

// Compression - Response hajmini kichraytirish
app.use(compression());

// Logging - Production uchun
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // Detailed logs
} else {
  app.use(morgan('dev')); // Development logs
}

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production'
    ? [
        process.env.CLIENT_URL,
        'https://wood-export-frontend.onrender.com',
        'https://export-1-y4tz.onrender.com',
        'http://akmalaka.biznesjon.uz',
        'https://akmalaka.biznesjon.uz'
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      console.log('❌ CORS blocked origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth')); // Auth restored
app.use('/api/client', require('./routes/client')); // Mijozlar
app.use('/api/vagon', require('./routes/vagon')); // Vagonlar
app.use('/api/vagon-lot', require('./routes/vagonLot')); // Vagon lotlari (YANGI)
app.use('/api/vagon-expense', require('./routes/vagonExpense')); // Vagon xarajatlari (YANGI) - Working
// app.use('/api/debt', require('./routes/debt')); // Qarz daftarcha (YANGI) - Temporarily disabled
app.use('/api/vagon-sale', require('./routes/vagonSale')); // Vagon sotuvlari - Fixed
app.use('/api/business-logic', require('./routes/businessLogic')); // TO'LIQ BIZNES LOGIKASI - Working
app.use('/api/cash', require('./routes/cash')); // Pul oqimi


app.use('/api/reports', require('./routes/reports'));
app.use('/api/exchange-rate', require('./routes/exchangeRate'));



// app.use('/api/expense-advanced', require('./routes/expenseAdvanced')); // Kengaytirilgan xarajatlar
// app.use('/api/loss-liability', require('./routes/lossLiability')); // Yo'qotish javobgarligi (YANGI)
// app.use('/api/expense-allocation', require('./routes/expenseAllocation')); // Xarajat taqsimoti (YANGI)
// app.use('/api/system-settings', require('./routes/systemSettings')); // Tizim sozlamalari (YANGI)
// app.use('/api/delivery', require('./routes/delivery')); // Olib kelib berish logistika (YANGI)
// app.use('/api/monitoring', require('./routes/monitoring')); // System monitoring (YANGI)
// app.use('/api/backup', require('./routes/backup'));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Server xatosi:', err);
  res.status(500).json({ 
    message: 'Server ichki xatosi',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Ichki server xatosi'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint topilmadi' });
});

// MongoDB connection with optimized pooling (OPTIMIZED TIMEOUTS)
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // Increased for better stability
  socketTimeoutMS: 45000, // Increased for large operations
  connectTimeoutMS: 30000, // Increased for initial connection
  maxPoolSize: 20, // Increased for better concurrency
  minPoolSize: 5, // Increased minimum connections
  maxIdleTimeMS: 30000, // Increased idle time
  retryWrites: true,
  retryReads: true,
  readPreference: 'primary', // Changed to primary for transaction compatibility
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 10000 // Increased for complex writes
  }
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wood_system', mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB ga muvaffaqiyatli ulandi');
    console.log('📊 Database:', mongoose.connection.name);
  })
  .catch(err => {
    logger.error('❌ MongoDB ulanish xatosi:', err.message);
    logger.error('💡 Yechim: Internet ulanishini va MongoDB Atlas IP whitelist ni tekshiring');
  });

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB ulanishi uzildi');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB ga qayta ulandi');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB xatosi:', err.message);
});

const PORT = process.env.PORT || 5002;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(false, () => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Test uchun server'ni export qilish
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT} portda ishlamoqda`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security: Helmet, Rate Limiting, Compression enabled`);
    
    // Real-time valyuta kurslarini avtomatik yangilashni boshlash
    console.log(`💱 Real-time valyuta kurslari avtomatik yangilanishi boshlandi`);
    // exchangeRateService.startAutoUpdate(); // Temporarily disabled for debugging
  });
}

module.exports = app;