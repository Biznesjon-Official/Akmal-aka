const mongoose = require('mongoose');

/**
 * MongoDB transaction ni retry mexanizmi bilan bajarish
 * Write conflict xatolarini avtomatik qayta urinish
 */
async function withRetry(operation, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      // Operation ni bajarish
      const result = await operation(session);
      
      // Commit qilish
      await session.commitTransaction();
      
      return result;
    } catch (error) {
      // Transaction ni bekor qilish
      await session.abortTransaction();
      
      lastError = error;
      
      // Write conflict xatoligini tekshirish
      const isWriteConflict = 
        error.code === 112 || // WriteConflict
        error.codeName === 'WriteConflict' ||
        (error.message && error.message.includes('Write conflict'));
      
      // Agar write conflict bo'lsa va urinishlar qolgan bo'lsa, qayta urinish
      if (isWriteConflict && attempt < maxRetries) {
        console.log(`⚠️ Write conflict detected, retrying (${attempt}/${maxRetries})...`);
        
        // Exponential backoff - har safar ko'proq kutish
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        continue;
      }
      
      // Boshqa xatoliklar yoki urinishlar tugagan bo'lsa, xatolikni qaytarish
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  // Agar barcha urinishlar muvaffaqiyatsiz bo'lsa
  throw lastError;
}

/**
 * Transaction ni oddiy usulda bajarish (retry siz)
 */
async function withTransaction(operation) {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  withRetry,
  withTransaction
};
