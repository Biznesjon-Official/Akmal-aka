const mongoose = require('mongoose');

/**
 * Safe transaction with automatic retry on write conflicts
 * Bu funksiya MongoDB write conflict xatolarini avtomatik hal qiladi
 */
async function safeTransaction(operation, options = {}) {
  const {
    maxRetries = 5,
    initialDelay = 50,
    maxDelay = 2000,
    onRetry = null
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      // Transaction ni boshlash
      await session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary'
      });
      
      // Operatsiyani bajarish
      const result = await operation(session);
      
      // Commit qilish
      await session.commitTransaction();
      
      // Muvaffaqiyatli bo'lsa, natijani qaytarish
      if (attempt > 1) {
        console.log(`✅ Transaction muvaffaqiyatli (${attempt}-urinishda)`);
      }
      
      return result;
      
    } catch (error) {
      // Transaction ni bekor qilish
      await session.abortTransaction();
      
      lastError = error;
      
      // Write conflict yoki TransientTransactionError ni tekshirish
      const isRetryable = 
        error.code === 112 || // WriteConflict
        error.codeName === 'WriteConflict' ||
        error.hasErrorLabel?.('TransientTransactionError') ||
        (error.message && (
          error.message.includes('Write conflict') ||
          error.message.includes('write conflict') ||
          error.message.includes('WriteConflict')
        ));
      
      // Agar retry qilish mumkin bo'lsa va urinishlar qolgan bo'lsa
      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff with jitter
        const baseDelay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
        const delay = baseDelay + jitter;
        
        console.log(`⚠️ Write conflict (${attempt}/${maxRetries}), ${Math.round(delay)}ms kutilmoqda...`);
        
        // Callback chaqirish (agar berilgan bo'lsa)
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        // Kutish
        await new Promise(resolve => setTimeout(resolve, delay));
        
        continue;
      }
      
      // Boshqa xatoliklar yoki urinishlar tugagan
      console.error(`❌ Transaction xatolik (${attempt}-urinishda):`, error.message);
      throw error;
      
    } finally {
      await session.endSession();
    }
  }
  
  // Agar barcha urinishlar muvaffaqiyatsiz bo'lsa
  console.error(`❌ Transaction ${maxRetries} urinishdan keyin ham muvaffaqiyatsiz`);
  throw lastError;
}

/**
 * Optimistic locking uchun version field ni tekshirish
 */
function checkVersion(doc, expectedVersion) {
  if (doc.__v !== expectedVersion) {
    const error = new Error('Document versiyasi o\'zgargan, qayta urinib ko\'ring');
    error.code = 112; // WriteConflict code
    throw error;
  }
}

module.exports = {
  safeTransaction,
  checkVersion
};
