/**
 * MUAMMO #12 NI HAL QILISH: Input sanitization
 * 
 * XSS va injection hujumlaridan himoya
 */

const validator = require('validator');
const logger = require('../utils/logger');

/**
 * String'ni tozalash (XSS himoyasi)
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // HTML tag'larni olib tashlash
  let cleaned = str.replace(/<[^>]*>/g, '');
  
  // Script tag'larni olib tashlash
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Xavfli belgilarni escape qilish
  cleaned = validator.escape(cleaned);
  
  // Ortiqcha bo'sh joylarni olib tashlash
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Obyektdagi barcha string'larni tozalash
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Telefon raqamini validatsiya qilish
 */
function validatePhone(phone) {
  if (!phone) return { valid: false, error: 'Telefon raqami kiritilishi shart' };
  
  // Faqat raqamlar, +, -, (, ), bo'sh joy
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Telefon raqami noto\'g\'ri formatda' };
  }
  
  // Minimal uzunlik
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 9) {
    return { valid: false, error: 'Telefon raqami juda qisqa' };
  }
  
  return { valid: true, cleaned: phone.trim() };
}

/**
 * Email validatsiyasi
 */
function validateEmail(email) {
  if (!email) return { valid: false, error: 'Email kiritilishi shart' };
  
  if (!validator.isEmail(email)) {
    return { valid: false, error: 'Email noto\'g\'ri formatda' };
  }
  
  return { valid: true, cleaned: email.toLowerCase().trim() };
}

/**
 * Summa validatsiyasi
 */
function validateAmount(amount, fieldName = 'Summa') {
  if (amount === undefined || amount === null) {
    return { valid: false, error: `${fieldName} kiritilishi shart` };
  }
  
  const numAmount = Number(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: `${fieldName} raqam bo'lishi kerak` };
  }
  
  if (numAmount < 0) {
    return { valid: false, error: `${fieldName} 0 dan kichik bo'lishi mumkin emas` };
  }
  
  // Maksimal qiymat (xatoliklarni oldini olish uchun)
  const MAX_AMOUNT = 1000000000; // 1 milliard
  if (numAmount > MAX_AMOUNT) {
    return { valid: false, error: `${fieldName} juda katta (maksimal: ${MAX_AMOUNT})` };
  }
  
  return { valid: true, cleaned: numAmount };
}

/**
 * Sana validatsiyasi
 */
function validateDate(date, fieldName = 'Sana') {
  if (!date) return { valid: false, error: `${fieldName} kiritilishi shart` };
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: `${fieldName} noto'g'ri formatda` };
  }
  
  // Kelajakdagi sana bo'lmasligi kerak (ba'zi holatlarda)
  const now = new Date();
  if (dateObj > now) {
    logger.warn(`Future date provided: ${date}`);
  }
  
  // Juda eski sana bo'lmasligi kerak (2000 yildan oldin)
  const minDate = new Date('2000-01-01');
  if (dateObj < minDate) {
    return { valid: false, error: `${fieldName} juda eski (2000 yildan keyin bo'lishi kerak)` };
  }
  
  return { valid: true, cleaned: dateObj };
}

/**
 * Valyuta validatsiyasi
 */
function validateCurrency(currency) {
  const validCurrencies = ['USD', 'RUB'];
  
  if (!currency) {
    return { valid: false, error: 'Valyuta kiritilishi shart' };
  }
  
  if (!validCurrencies.includes(currency.toUpperCase())) {
    return { valid: false, error: `Valyuta noto'g'ri (faqat ${validCurrencies.join(', ')})` };
  }
  
  return { valid: true, cleaned: currency.toUpperCase() };
}

/**
 * MongoDB ObjectId validatsiyasi
 */
function validateObjectId(id, fieldName = 'ID') {
  if (!id) {
    return { valid: false, error: `${fieldName} kiritilishi shart` };
  }
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdRegex.test(id)) {
    return { valid: false, error: `${fieldName} noto'g'ri formatda` };
  }
  
  return { valid: true, cleaned: id };
}

/**
 * Middleware: Request body'ni tozalash
 */
function sanitizeRequestBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
    logger.debug('Request body sanitized');
  }
  next();
}

/**
 * Middleware: Query params'ni tozalash
 */
function sanitizeQueryParams(req, res, next) {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
    logger.debug('Query params sanitized');
  }
  next();
}

/**
 * Middleware: Barcha input'larni tozalash
 */
function sanitizeAllInputs(req, res, next) {
  sanitizeRequestBody(req, res, () => {
    sanitizeQueryParams(req, res, next);
  });
}

/**
 * SQL Injection himoyasi (MongoDB uchun)
 * NoSQL injection'dan himoya
 */
function preventNoSQLInjection(req, res, next) {
  const checkForInjection = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // MongoDB operator'larini tekshirish
        if (key.startsWith('$')) {
          logger.warn(`Potential NoSQL injection attempt: ${key}`);
          return true;
        }
        
        const value = obj[key];
        
        // Nested obyektlarni tekshirish
        if (typeof value === 'object' && value !== null) {
          if (checkForInjection(value)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };
  
  // Body'ni tekshirish
  if (req.body && checkForInjection(req.body)) {
    logger.error(`NoSQL injection attempt blocked: ${req.ip} - ${req.path}`);
    return res.status(400).json({
      message: 'Noto\'g\'ri so\'rov formati',
      code: 'INVALID_REQUEST'
    });
  }
  
  // Query params'ni tekshirish
  if (req.query && checkForInjection(req.query)) {
    logger.error(`NoSQL injection attempt blocked: ${req.ip} - ${req.path}`);
    return res.status(400).json({
      message: 'Noto\'g\'ri so\'rov formati',
      code: 'INVALID_REQUEST'
    });
  }
  
  next();
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  validatePhone,
  validateEmail,
  validateAmount,
  validateDate,
  validateCurrency,
  validateObjectId,
  sanitizeRequestBody,
  sanitizeQueryParams,
  sanitizeAllInputs,
  preventNoSQLInjection
};
