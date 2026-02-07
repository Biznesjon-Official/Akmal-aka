// Error handling utilities

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export function isWriteConflictError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || error.response?.data?.message || '';
  return (
    message.includes('Write conflict') ||
    message.includes('write conflict') ||
    message.includes('WriteConflict') ||
    error.code === 112 ||
    error.response?.status === 409
  );
}

export function getErrorMessage(error: any): string {
  if (isWriteConflictError(error)) {
    return 'Bir nechta foydalanuvchi bir vaqtda bir xil ma\'lumotni o\'zgartirmoqda. Iltimos, qayta urinib ko\'ring.';
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Noma\'lum xatolik yuz berdi';
}

export async function retryOnConflict<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 500
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (isWriteConflictError(error) && attempt < maxRetries) {
        console.log(`⚠️ Write conflict detected, retrying (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
