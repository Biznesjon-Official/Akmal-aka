/**
 * Validatsiya helper funksiyalari
 * Barcha input ma'lumotlarini tekshirish uchun
 */

const logger = require('./logger');

/**
 * Hajm validatsiyasi
 */
function validateVolume(volume, fieldName = 'Hajm') {
  const errors = [];
  
  if (volume === undefined || volume === null) {
    errors.push(`${fieldName} kiritilishi shart`);
  } else if (typeof volume !== 'number') {
    errors.push(`${fieldName} raqam bo'lishi kerak`);
  } else if (volume < 0) {
    errors.push(`${fieldName} manfiy bo'lishi mumkin emas`);
  } else if (volume === 0) {
    errors.push(`${fieldName} 0 dan katta bo'lishi kerak`);
  } else if (volume > 1000000) {
    errors.push(`${fieldName} juda katta (max: 1,000,000 m³)`);
  }
  
  return errors;
}

/**
 * Narx validatsiyasi
 */
function validatePrice(price, fieldName = 'Narx') {
  const errors = [];
  
  if (price === undefined || price === null) {
    errors.push(`${fieldName} kiritilishi shart`);
  } else if (typeof price !== 'number') {
    errors.push(`${fieldName} raqam bo'lishi kerak`);
  } else if (price < 0) {
    errors.push(`${fieldName} manfiy bo'lishi mumkin emas`);
  } else if (price > 1000000000) {
    errors.push(`${fieldName} juda katta`);
  }
  
  return errors;
}

/**
 * Valyuta validatsiyasi
 */
function validateCurrency(currency) {
  const errors = [];
  const validCurrencies = ['USD', 'RUB'];
  
  if (!currency) {
    errors.push('Valyuta kiritilishi shart');
  } else if (!validCurrencies.includes(currency)) {
    errors.push(`Valyuta faqat ${validCurrencies.join(' yoki ')} bo'lishi mumkin`);
  }
  
  return errors;
}

/**
 * Sana validatsiyasi
 */
function validateDate(date, fieldName = 'Sana', options = {}) {
  const errors = [];
  
  if (!date) {
    if (options.required) {
      errors.push(`${fieldName} kiritilishi shart`);
    }
    return errors;
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    errors.push(`${fieldName} noto'g'ri formatda`);
    return errors;
  }
  
  // Kelajak sanasini tekshirish
  if (options.noFuture && dateObj > new Date()) {
    errors.push(`${fieldName} kelajakda bo'lishi mumkin emas`);
  }
  
  // Minimal sana
  if (options.minDate) {
    const minDate = new Date(options.minDate);
    if (dateObj < minDate) {
      errors.push(`${fieldName} ${minDate.toLocaleDateString()} dan oldin bo'lishi mumkin emas`);
    }
  }
  
  // Maksimal sana
  if (options.maxDate) {
    const maxDate = new Date(options.maxDate);
    if (dateObj > maxDate) {
      errors.push(`${fieldName} ${maxDate.toLocaleDateString()} dan keyin bo'lishi mumkin emas`);
    }
  }
  
  return errors;
}

/**
 * O'lcham validatsiyasi (35×125×6 format)
 */
function validateDimensions(dimensions) {
  const errors = [];
  
  if (!dimensions) {
    errors.push('O\'lcham kiritilishi shart');
    return errors;
  }
  
  // Format tekshiruvi: 35×125×6 yoki 35x125x6
  const regex = /^(\d+(?:\.\d+)?)[×x](\d+(?:\.\d+)?)[×x](\d+(?:\.\d+)?)$/;
  const match = dimensions.match(regex);
  
  if (!match) {
    errors.push('O\'lcham formati noto\'g\'ri (masalan: 35×125×6)');
    return errors;
  }
  
  const [, thickness, width, length] = match;
  
  // Qiymatlar musbat bo'lishi kerak
  if (parseFloat(thickness) <= 0 || parseFloat(width) <= 0 || parseFloat(length) <= 0) {
    errors.push('O\'lcham qiymatlari 0 dan katta bo\'lishi kerak');
  }
  
  // Maksimal qiymatlar
  if (parseFloat(thickness) > 1000 || parseFloat(width) > 10000 || parseFloat(length) > 100000) {
    errors.push('O\'lcham qiymatlari juda katta');
  }
  
  return errors;
}

/**
 * Foiz validatsiyasi
 */
function validatePercentage(percentage, fieldName = 'Foiz') {
  const errors = [];
  
  if (percentage === undefined || percentage === null) {
    errors.push(`${fieldName} kiritilishi shart`);
  } else if (typeof percentage !== 'number') {
    errors.push(`${fieldName} raqam bo'lishi kerak`);
  } else if (percentage < 0 || percentage > 100) {
    errors.push(`${fieldName} 0 va 100 orasida bo'lishi kerak`);
  }
  
  return errors;
}

/**
 * Brak javobgarlik taqsimoti validatsiyasi
 */
function validateBrakLiability(distribution) {
  const errors = [];
  
  if (!distribution) {
    return errors; // Ixtiyoriy
  }
  
  const { seller_percentage, buyer_percentage } = distribution;
  
  // Foizlarni tekshirish
  errors.push(...validatePercentage(seller_percentage, 'Sotuvchi foizi'));
  errors.push(...validatePercentage(buyer_percentage, 'Xaridor foizi'));
  
  // Yig'indi 100% bo'lishi kerak
  if (seller_percentage + buyer_percentage !== 100) {
    errors.push('Sotuvchi va xaridor foizlari yig\'indisi 100% bo\'lishi kerak');
  }
  
  return errors;
}

/**
 * VagonSale ma'lumotlarini validatsiya qilish
 */
function validateVagonSaleData(data) {
  const errors = [];
  
  // Asosiy maydonlar
  if (!data.lot) errors.push('Lot tanlanishi shart');
  if (!data.client) errors.push('Mijoz tanlanishi shart');
  
  // Valyuta
  errors.push(...validateCurrency(data.sale_currency));
  
  // Sotuv birligi
  if (data.sale_unit === 'pieces') {
    // Dona bo'yicha sotuv
    if (!data.sent_quantity) {
      errors.push('Dona soni kiritilishi shart');
    } else if (data.sent_quantity <= 0) {
      errors.push('Dona soni 0 dan katta bo\'lishi kerak');
    }
    
    errors.push(...validatePrice(data.price_per_piece, 'Dona narxi'));
    
  } else {
    // Hajm bo'yicha sotuv
    const volume = data.warehouse_dispatched_volume_m3 || data.sent_volume_m3;
    errors.push(...validateVolume(volume, 'Sotilgan hajm'));
    errors.push(...validatePrice(data.price_per_m3, 'M³ narxi'));
  }
  
  // To'lov
  if (data.paid_amount !== undefined && data.paid_amount !== null) {
    errors.push(...validatePrice(data.paid_amount, 'To\'langan summa'));
    
    // To'lov jami narxdan katta bo'lmasligi kerak
    if (data.total_price && data.paid_amount > data.total_price) {
      errors.push('To\'langan summa jami narxdan katta bo\'lishi mumkin emas');
    }
  }
  
  // Sana
  if (data.sale_date) {
    errors.push(...validateDate(data.sale_date, 'Sotuv sanasi', { noFuture: true }));
  }
  
  // Transport yo'qotishi
  if (data.transport_loss_m3 && data.transport_loss_m3 > 0) {
    errors.push(...validateVolume(data.transport_loss_m3, 'Transport yo\'qotishi'));
    
    // Yo'qotish sotilgan hajmdan katta bo'lmasligi kerak
    const volume = data.warehouse_dispatched_volume_m3 || data.sent_volume_m3;
    if (volume && data.transport_loss_m3 > volume) {
      errors.push('Transport yo\'qotishi sotilgan hajmdan katta bo\'lishi mumkin emas');
    }
  }
  
  // Brak javobgarlik
  if (data.brak_liability_distribution) {
    errors.push(...validateBrakLiability(data.brak_liability_distribution));
  }
  
  return errors;
}

/**
 * VagonLot ma'lumotlarini validatsiya qilish
 */
function validateVagonLotData(data) {
  const errors = [];
  
  // Asosiy maydonlar
  if (!data.vagon) errors.push('Vagon tanlanishi shart');
  
  // O'lcham
  errors.push(...validateDimensions(data.dimensions));
  
  // Soni
  if (!data.quantity || data.quantity <= 0) {
    errors.push('Soni 0 dan katta bo\'lishi kerak');
  }
  
  // Hajm
  errors.push(...validateVolume(data.volume_m3, 'Hajm'));
  
  // Xarid ma'lumotlari
  errors.push(...validateCurrency(data.purchase_currency));
  errors.push(...validatePrice(data.purchase_amount, 'Xarid summasi'));
  
  // Yo'qotish
  if (data.loss_volume_m3 && data.loss_volume_m3 > 0) {
    errors.push(...validateVolume(data.loss_volume_m3, 'Yo\'qotish'));
    
    // Yo'qotish jami hajmdan katta bo'lmasligi kerak
    if (data.volume_m3 && data.loss_volume_m3 > data.volume_m3) {
      errors.push('Yo\'qotish jami hajmdan katta bo\'lishi mumkin emas');
    }
  }
  
  return errors;
}

/**
 * Validatsiya natijasini qaytarish
 */
function getValidationResult(errors) {
  if (errors.length === 0) {
    return { valid: true };
  }
  
  logger.warn('Validatsiya xatolari:', errors);
  
  return {
    valid: false,
    errors,
    message: errors.join('; ')
  };
}

module.exports = {
  validateVolume,
  validatePrice,
  validateCurrency,
  validateDate,
  validateDimensions,
  validatePercentage,
  validateBrakLiability,
  validateVagonSaleData,
  validateVagonLotData,
  getValidationResult
};
