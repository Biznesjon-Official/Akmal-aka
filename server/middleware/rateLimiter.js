/**
 * MUAMMO #13 NI HAL QILISH: Rate limiting
 * 
 * Moliyaviy operatsiyalar va boshqa endpoint'lar uchun rate limiting
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Umumiy rate limiter (barcha endpoint'lar uchun)
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 1000, // 1000 request per 15 minutes
  message: {
    message: 'Juda ko\'p so\'rov yuborildi. Iltimos, biroz kuting',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({
      message: 'Juda ko\'p so\'rov yuborildi. Iltimos, biroz kuting',
      code: 'TOO_MANY_REQUESTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Login uchun rate limiter (xavfsizlik uchun)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 5, // 5 urinish per 15 minutes
  skipSuccessfulRequests: true, // Muvaffaqiyatli login'larni hisobga olmaslik
  message: {
    message: 'Juda ko\'p login urinishlari. Iltimos, 15 daqiqadan keyin qayta urinib ko\'ring',
    code: 'TOO_MANY_LOGIN_ATTEMPTS'
  },
  handler: (req, res) => {
    logger.warn(`Login rate limit exceeded: ${req.ip} - ${req.body.username}`);
    res.status(429).json({
      message: 'Juda ko\'p login urinishlari. Iltimos, 15 daqiqadan keyin qayta urinib ko\'ring',
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Moliyaviy operatsiyalar uchun rate limiter
 * (VagonSale, Cash, Debt yaratish/o'zgartirish)
 */
const financialLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  max: 20, // 20 request per minute
  message: {
    message: 'Moliyaviy operatsiyalar uchun juda ko\'p so\'rov. Iltimos, biroz kuting',
    code: 'TOO_MANY_FINANCIAL_REQUESTS'
  },
  handler: (req, res) => {
    logger.warn(`Financial rate limit exceeded: ${req.ip} - ${req.path} - User: ${req.user?.username}`);
    res.status(429).json({
      message: 'Moliyaviy operatsiyalar uchun juda ko\'p so\'rov. Iltimos, biroz kuting',
      code: 'TOO_MANY_FINANCIAL_REQUESTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Qidirish uchun rate limiter
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  max: 100, // 100 request per minute
  message: {
    message: 'Juda ko\'p qidiruv so\'rovi. Iltimos, biroz kuting',
    code: 'TOO_MANY_SEARCH_REQUESTS'
  },
  handler: (req, res) => {
    logger.warn(`Search rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({
      message: 'Juda ko\'p qidiruv so\'rovi. Iltimos, biroz kuting',
      code: 'TOO_MANY_SEARCH_REQUESTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * O'chirish operatsiyalari uchun rate limiter
 */
const deleteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 daqiqa
  max: 10, // 10 request per 5 minutes
  message: {
    message: 'Juda ko\'p o\'chirish operatsiyasi. Iltimos, biroz kuting',
    code: 'TOO_MANY_DELETE_REQUESTS'
  },
  handler: (req, res) => {
    logger.warn(`Delete rate limit exceeded: ${req.ip} - ${req.path} - User: ${req.user?.username}`);
    res.status(429).json({
      message: 'Juda ko\'p o\'chirish operatsiyasi. Iltimos, biroz kuting',
      code: 'TOO_MANY_DELETE_REQUESTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Hisobot export uchun rate limiter
 */
const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 daqiqa
  max: 5, // 5 export per 5 minutes
  message: {
    message: 'Juda ko\'p export so\'rovi. Iltimos, biroz kuting',
    code: 'TOO_MANY_EXPORT_REQUESTS'
  },
  handler: (req, res) => {
    logger.warn(`Export rate limit exceeded: ${req.ip} - ${req.path} - User: ${req.user?.username}`);
    res.status(429).json({
      message: 'Juda ko\'p export so\'rovi. Iltimos, biroz kuting',
      code: 'TOO_MANY_EXPORT_REQUESTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * File upload uchun rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 20, // 20 uploads per 15 minutes
  message: {
    message: 'Juda ko\'p fayl yuklash so\'rovi. Iltimos, biroz kuting',
    code: 'TOO_MANY_UPLOAD_REQUESTS'
  },
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded: ${req.ip} - ${req.path} - User: ${req.user?.username}`);
    res.status(429).json({
      message: 'Juda ko\'p fayl yuklash so\'rovi. Iltimos, biroz kuting',
      code: 'TOO_MANY_UPLOAD_REQUESTS',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

module.exports = {
  generalLimiter,
  loginLimiter,
  financialLimiter,
  searchLimiter,
  deleteLimiter,
  exportLimiter,
  uploadLimiter
};
