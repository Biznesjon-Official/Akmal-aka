/**
 * Transaction retry middleware
 * MongoDB write conflict xatolarini avtomatik qayta urinish
 */

function isWriteConflict(error) {
  return (
    error.code === 112 || // WriteConflict error code
    error.codeName === 'WriteConflict' ||
    (error.message && error.message.toLowerCase().includes('write conflict'))
  );
}

function retryOnConflict(maxRetries = 3) {
  return async (req, res, next) => {
    // Original send funksiyasini saqlash
    const originalSend = res.send;
    const originalJson = res.json;
    
    let attempt = 0;
    let lastError = null;
    
    // Error handler
    const errorHandler = async (error) => {
      lastError = error;
      attempt++;
      
      if (isWriteConflict(error) && attempt < maxRetries) {
        console.log(`⚠️ Write conflict detected on ${req.method} ${req.path}, retrying (${attempt}/${maxRetries})...`);
        
        // Exponential backoff
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Qayta urinish
        return next();
      }
      
      // Boshqa xatoliklar yoki urinishlar tugagan
      if (!res.headersSent) {
        res.status(error.status || 500).json({
          message: error.message || 'Server xatoligi',
          error: process.env.NODE_ENV === 'development' ? error : {}
        });
      }
    };
    
    // Error ni ushlash
    res.on('error', errorHandler);
    
    next();
  };
}

module.exports = retryOnConflict;
