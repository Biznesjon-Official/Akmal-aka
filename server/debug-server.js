// Debug version of server to catch startup errors
console.log('🚀 Server debug mode started...');

try {
  console.log('📦 Loading dependencies...');
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
  
  console.log('✅ Dependencies loaded successfully');
  
  const app = express();
  
  console.log('🔧 Setting up middleware...');
  
  // Trust proxy
  app.set('trust proxy', 1);
  
  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Juda ko\'p so\'rov yuborildi, iltimos keyinroq urinib ko\'ring',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Juda ko\'p login urinishi, 15 daqiqadan keyin qayta urinib ko\'ring',
    skipSuccessfulRequests: true
  });
  
  app.use('/api/', limiter);
  app.use('/api/auth/login', loginLimiter);
  
  // Compression
  app.use(compression());
  
  // Logging
  if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
  } else {
    app.use(morgan('dev'));
  }
  
  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? [
          process.env.CLIENT_URL,
          'https://wood-export-frontend.onrender.com',
          'https://export-1-y4tz.onrender.com',
          'http://akmalaka.biznesjon.uz'
        ].filter(Boolean)
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
  
  app.use(cors({
    origin: function(origin, callback) {
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
  
  console.log('✅ Middleware setup complete');
  
  console.log('🛣️ Setting up routes...');
  
  // Test route first
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
  });
  
  // Load routes one by one to catch errors
  try {
    console.log('   Loading auth routes...');
    app.use('/api/auth', require('./routes/auth'));
    console.log('   ✅ Auth routes loaded');
    
    console.log('   Loading client routes...');
    app.use('/api/client', require('./routes/client'));
    console.log('   ✅ Client routes loaded');
    
    console.log('   Loading vagon routes...');
    app.use('/api/vagon', require('./routes/vagon'));
    console.log('   ✅ Vagon routes loaded');
    
    console.log('   Loading vagon-lot routes...');
    app.use('/api/vagon-lot', require('./routes/vagonLot'));
    console.log('   ✅ Vagon-lot routes loaded');
    
    console.log('   Loading vagon-expense routes...');
    app.use('/api/vagon-expense', require('./routes/vagonExpense'));
    console.log('   ✅ Vagon-expense routes loaded');
    
    console.log('   Loading cash routes...');
    app.use('/api/cash', require('./routes/cash'));
    console.log('   ✅ Cash routes loaded');
    
    console.log('   Loading business-logic routes...');
    app.use('/api/business-logic', require('./routes/businessLogic'));
    console.log('   ✅ Business-logic routes loaded');
    
    console.log('   Loading vagon-sale routes...');
    app.use('/api/vagon-sale', require('./routes/vagonSale'));
    console.log('   ✅ Vagon-sale routes loaded');
    
    console.log('   Loading reports routes...');
    app.use('/api/reports', require('./routes/reports'));
    console.log('   ✅ Reports routes loaded');
    
    console.log('   Loading exchange-rate routes...');
    app.use('/api/exchange-rate', require('./routes/exchangeRate'));
    console.log('   ✅ Exchange-rate routes loaded');
    
  } catch (routeError) {
    console.error('❌ Route loading error:', routeError.message);
    console.error('Stack:', routeError.stack);
    process.exit(1);
  }
  
  console.log('✅ All routes loaded successfully');
  
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
  
  console.log('🗄️ Connecting to MongoDB...');
  
  // MongoDB connection
  const mongooseOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary',
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 10000
    }
  };
  
  mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
      
      const PORT = process.env.PORT || 5002;
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API available at: http://localhost:${PORT}/api`);
        console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
      });
      
      server.on('error', (error) => {
        console.error('❌ Server listen error:', error);
      });
    })
    .catch((error) => {
      console.error('❌ MongoDB connection error:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Server startup error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}