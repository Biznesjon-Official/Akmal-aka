// Custom Error Classes

class ClientNotFoundError extends Error {
  constructor(clientId) {
    super(`Mijoz ID ${clientId} bilan topilmadi`);
    this.name = 'ClientNotFoundError';
    this.clientId = clientId;
    this.statusCode = 404;
  }
}

class VagonNotFoundError extends Error {
  constructor(vagonId) {
    super(`Vagon ID ${vagonId} bilan topilmadi`);
    this.name = 'VagonNotFoundError';
    this.vagonId = vagonId;
    this.statusCode = 404;
  }
}

class VagonLotNotFoundError extends Error {
  constructor(lotId) {
    super(`Vagon lot ID ${lotId} bilan topilmadi`);
    this.name = 'VagonLotNotFoundError';
    this.lotId = lotId;
    this.statusCode = 404;
  }
}

class InsufficientVolumeError extends Error {
  constructor(requestedVolume, availableVolume) {
    super(`Yetarli hajm yo'q. So'ralgan: ${requestedVolume} m³, Mavjud: ${availableVolume} m³`);
    this.name = 'InsufficientVolumeError';
    this.requestedVolume = requestedVolume;
    this.availableVolume = availableVolume;
    this.statusCode = 400;
  }
}

class InvalidCurrencyError extends Error {
  constructor(currency) {
    super(`Noto'g'ri valyuta: ${currency}. Faqat USD va RUB qabul qilinadi`);
    this.name = 'InvalidCurrencyError';
    this.currency = currency;
    this.statusCode = 400;
  }
}

class PaymentExceedsDebtError extends Error {
  constructor(paymentAmount, debtAmount) {
    super(`To'lov summasi qarzdan katta: To'lov ${paymentAmount}, Qarz ${debtAmount}`);
    this.name = 'PaymentExceedsDebtError';
    this.paymentAmount = paymentAmount;
    this.debtAmount = debtAmount;
    this.statusCode = 400;
  }
}

class DatabaseConnectionError extends Error {
  constructor(originalError) {
    super(`Ma'lumotlar bazasiga ulanishda xatolik: ${originalError.message}`);
    this.name = 'DatabaseConnectionError';
    this.originalError = originalError;
    this.statusCode = 503;
  }
}

class ValidationError extends Error {
  constructor(field, value, requirement) {
    super(`Validatsiya xatosi: ${field} = "${value}" ${requirement}`);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.requirement = requirement;
    this.statusCode = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(action) {
    super(`Ruxsat yo'q: ${action} amalga oshirish uchun yetarli huquq mavjud emas`);
    this.name = 'UnauthorizedError';
    this.action = action;
    this.statusCode = 403;
  }
}

class DuplicateRecordError extends Error {
  constructor(field, value) {
    super(`Takroriy yozuv: ${field} = "${value}" allaqachon mavjud`);
    this.name = 'DuplicateRecordError';
    this.field = field;
    this.value = value;
    this.statusCode = 409;
  }
}

// Error handler middleware uchun helper function
const handleCustomError = (error, res) => {
  const logger = require('./logger');
  
  // Custom error'lar uchun
  if (error.statusCode) {
    logger.error(`${error.name}: ${error.message}`, {
      statusCode: error.statusCode,
      ...error
    });
    
    return res.status(error.statusCode).json({
      success: false,
      error: error.name,
      message: error.message,
      details: {
        name: error.name,
        statusCode: error.statusCode
      }
    });
  }
  
  // MongoDB validation error'lari uchun
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    logger.error('MongoDB Validation Error:', messages);
    
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Ma\'lumotlar validatsiyasida xatolik',
      details: messages
    });
  }
  
  // MongoDB duplicate key error uchun
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    logger.error(`Duplicate key error: ${field} = ${value}`);
    
    return res.status(409).json({
      success: false,
      error: 'DuplicateError',
      message: `${field} allaqachon mavjud: ${value}`,
      details: { field, value }
    });
  }
  
  // Cast error (noto'g'ri ObjectId)
  if (error.name === 'CastError') {
    logger.error(`Cast error: ${error.message}`);
    
    return res.status(400).json({
      success: false,
      error: 'CastError',
      message: 'Noto\'g\'ri ID format',
      details: { path: error.path, value: error.value }
    });
  }
  
  // Generic server error
  logger.error('Unexpected error:', error);
  
  return res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: 'Server ichki xatosi',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

module.exports = {
  ClientNotFoundError,
  VagonNotFoundError,
  VagonLotNotFoundError,
  InsufficientVolumeError,
  InvalidCurrencyError,
  PaymentExceedsDebtError,
  DatabaseConnectionError,
  ValidationError,
  UnauthorizedError,
  DuplicateRecordError,
  handleCustomError
};