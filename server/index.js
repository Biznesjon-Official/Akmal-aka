const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

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

// Compression - Response hajmini kichraytirish
app.use(compression());

// Logging - Production uchun
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // Detailed logs
} else {
  app.use(morgan('dev')); // Development logs
}

// CORS
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL || 'https://your-app.onrender.com'] // Production URL
  : ['http://localhost:3000', 'http://192.168.1.7:3000']; // Development URLs

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/client', require('./routes/client')); // Mijozlar
app.use('/api/vagon', require('./routes/vagon')); // Vagonlar
app.use('/api/vagon-lot', require('./routes/vagonLot')); // Vagon lotlari (YANGI)
app.use('/api/vagon-expense', require('./routes/vagonExpense')); // Vagon xarajatlari (YANGI)
app.use('/api/vagon-sale', require('./routes/vagonSale')); // Vagon sotuvlari
app.use('/api/cash', require('./routes/cash')); // Pul oqimi
app.use('/api/wood', require('./routes/wood')); // Eski (keyinroq o'chiramiz)
app.use('/api/kassa', require('./routes/kassa'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/exchange-rate', require('./routes/exchangeRate'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/sale', require('./routes/sale'));
app.use('/api/expense', require('./routes/expense'));
app.use('/api/backup', require('./routes/backup'));

// Serve static files from Next.js build (Production only)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/.next');
  const clientPublicPath = path.join(__dirname, '../client/public');
  
  // Serve Next.js static files
  app.use('/_next', express.static(path.join(clientBuildPath, 'static')));
  app.use('/public', express.static(clientPublicPath));
  
  // Serve Next.js pages
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA)
    res.sendFile(path.join(__dirname, '../client/out/index.html'), (err) => {
      if (err) {
        res.status(404).json({ message: 'Page not found' });
      }
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server xatosi:', err);
  res.status(500).json({ 
    message: 'Server ichki xatosi',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Ichki server xatosi'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint topilmadi' });
});

// MongoDB connection
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // 30 soniya
  socketTimeoutMS: 45000, // 45 soniya
  connectTimeoutMS: 30000, // 30 soniya
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  retryReads: true
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wood_system', mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB ga muvaffaqiyatli ulandi');
    console.log('📊 Database:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
    console.error('💡 Yechim: Internet ulanishini va MongoDB Atlas IP whitelist ni tekshiring');
  });

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB ulanishi uzildi');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB ga qayta ulandi');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB xatosi:', err.message);
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
  });
}

module.exports = app;