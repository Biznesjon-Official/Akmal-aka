/**
 * KRITIK MUAMMO #2 NI HAL QILISH: Hajm validatsiyasi
 * 
 * Bu middleware VagonSale yaratishda hajm validatsiyasini ta'minlaydi
 * Mavjud hajmdan ko'proq sotishga yo'l qo'ymaydi
 */

const logger = require('../utils/logger');

/**
 * VagonLot hajmini tekshirish
 * @param {Object} lotDoc - VagonLot dokumenti
 * @param {Number} requestedVolume - So'ralgan hajm
 * @param {Number} requestedQuantity - So'ralgan dona soni
 * @param {String} saleUnit - Sotuv birligi ('volume' yoki 'pieces')
 * @returns {Object} - Validatsiya natijasi
 */
function validateLotVolume(lotDoc, requestedVolume, requestedQuantity, saleUnit = 'volume') {
  const EPSILON = 0.0001; // Floating-point xatolari uchun toleransiya (0.1 litr)
  
  const availableVolume = lotDoc.warehouse_remaining_volume_m3 || 0;
  const availableQuantity = lotDoc.remaining_quantity || 0;
  
  logger.info(`📊 Hajm validatsiyasi:`);
  logger.info(`   Mavjud: ${availableVolume.toFixed(4)} m³, ${availableQuantity} dona`);
  logger.info(`   So'ralgan: ${requestedVolume?.toFixed(4) || 0} m³, ${requestedQuantity || 0} dona`);
  logger.info(`   Sotuv birligi: ${saleUnit}`);
  
  if (saleUnit === 'pieces') {
    // Dona bo'yicha validatsiya
    if (requestedQuantity > availableQuantity) {
      return {
        valid: false,
        error: `Lot da mavjud dona: ${availableQuantity}. Siz ${requestedQuantity} dona jo'natmoqchisiz`,
        available: availableQuantity,
        requested: requestedQuantity,
        unit: 'pieces'
      };
    }
  } else {
    // Hajm bo'yicha validatsiya
    if (requestedVolume > availableVolume + EPSILON) {
      return {
        valid: false,
        error: `Lot da mavjud hajm: ${availableVolume.toFixed(4)} m³. Siz ${requestedVolume.toFixed(4)} m³ jo'natmoqchisiz`,
        available: availableVolume,
        requested: requestedVolume,
        unit: 'volume'
      };
    }
  }
  
  logger.info(`✅ Hajm validatsiyasi muvaffaqiyatli`);
  
  return {
    valid: true,
    available: saleUnit === 'pieces' ? availableQuantity : availableVolume,
    requested: saleUnit === 'pieces' ? requestedQuantity : requestedVolume,
    unit: saleUnit
  };
}

/**
 * Transport yo'qotishini validatsiya qilish
 * @param {Number} dispatchedVolume - Jo'natilgan hajm
 * @param {Number} transportLoss - Transport yo'qotishi
 * @returns {Object} - Validatsiya natijasi
 */
function validateTransportLoss(dispatchedVolume, transportLoss) {
  if (!transportLoss || transportLoss === 0) {
    return { valid: true };
  }
  
  if (transportLoss < 0) {
    return {
      valid: false,
      error: 'Transport yo\'qotishi 0 dan kichik bo\'lishi mumkin emas'
    };
  }
  
  if (transportLoss >= dispatchedVolume) {
    return {
      valid: false,
      error: `Transport yo'qotishi (${transportLoss.toFixed(4)} m³) jo'natilgan hajmdan (${dispatchedVolume.toFixed(4)} m³) kichik bo'lishi kerak`
    };
  }
  
  // Ogohlantirish: Agar yo'qotish 10% dan ko'p bo'lsa
  const lossPercentage = (transportLoss / dispatchedVolume) * 100;
  if (lossPercentage > 10) {
    logger.warn(`⚠️ Yuqori transport yo'qotishi: ${lossPercentage.toFixed(2)}%`);
  }
  
  return { valid: true, lossPercentage };
}

/**
 * Narx validatsiyasi
 * @param {Number} price - Narx
 * @param {String} currency - Valyuta
 * @param {Number} costPerM3 - Tannarx (m³ uchun)
 * @returns {Object} - Validatsiya natijasi
 */
function validatePrice(price, currency, costPerM3 = null) {
  if (!price || price <= 0) {
    return {
      valid: false,
      error: 'Narx 0 dan katta bo\'lishi kerak'
    };
  }
  
  // Maksimal narx tekshiruvi (xatoliklarni oldini olish uchun)
  const MAX_PRICE = 1000000; // 1 million
  if (price > MAX_PRICE) {
    return {
      valid: false,
      error: `Narx juda katta: ${price} ${currency}. Maksimal: ${MAX_PRICE} ${currency}`
    };
  }
  
  // Agar tannarx ma'lum bo'lsa, zarar bilan sotilayotganini tekshirish
  if (costPerM3 && price < costPerM3) {
    const lossPercentage = ((costPerM3 - price) / costPerM3) * 100;
    logger.warn(`⚠️ Zarar bilan sotuv: Narx ${price} ${currency}, Tannarx ${costPerM3.toFixed(2)} ${currency} (${lossPercentage.toFixed(2)}% zarar)`);
    
    // Ogohlantirish, lekin ruxsat berish (ba'zan zarar bilan sotish kerak bo'lishi mumkin)
    return {
      valid: true,
      warning: `Zarar bilan sotuv: ${lossPercentage.toFixed(2)}% zarar`,
      lossPercentage
    };
  }
  
  return { valid: true };
}

/**
 * To'lov validatsiyasi
 * @param {Number} paidAmount - To'langan summa
 * @param {Number} totalPrice - Jami narx
 * @param {String} currency - Valyuta
 * @returns {Object} - Validatsiya natijasi
 */
function validatePayment(paidAmount, totalPrice, currency) {
  if (paidAmount < 0) {
    return {
      valid: false,
      error: 'To\'langan summa 0 dan kichik bo\'lishi mumkin emas'
    };
  }
  
  if (paidAmount > totalPrice) {
    return {
      valid: false,
      error: `To'langan summa (${paidAmount} ${currency}) jami narxdan (${totalPrice} ${currency}) katta bo'lishi mumkin emas`
    };
  }
  
  return { valid: true };
}

/**
 * Express middleware: VagonSale yaratish uchun validatsiya
 */
async function validateVagonSaleRequest(req, res, next) {
  try {
    const {
      lot,
      warehouse_dispatched_volume_m3,
      sent_volume_m3,
      sent_quantity,
      sale_unit,
      transport_loss_m3,
      client_loss_m3,
      price_per_m3,
      price_per_piece,
      paid_amount,
      sale_currency
    } = req.body;
    
    // Asosiy validatsiya
    if (!lot) {
      return res.status(400).json({ message: 'Lot tanlanishi shart' });
    }
    
    const VagonLot = require('../models/VagonLot');
    const lotDoc = await VagonLot.findById(lot);
    
    if (!lotDoc || lotDoc.isDeleted) {
      return res.status(404).json({ message: 'Lot topilmadi' });
    }
    
    // Hajm va dona validatsiyasi
    const dispatchedVolume = warehouse_dispatched_volume_m3 || sent_volume_m3;
    const transportLoss = transport_loss_m3 || client_loss_m3 || 0;
    
    if (sale_unit === 'pieces') {
      if (!sent_quantity) {
        return res.status(400).json({ message: 'Dona soni kiritilishi shart' });
      }
      
      const volumeValidation = validateLotVolume(lotDoc, null, sent_quantity, 'pieces');
      if (!volumeValidation.valid) {
        return res.status(400).json({ message: volumeValidation.error });
      }
      
      // Narx validatsiyasi
      if (!price_per_piece) {
        return res.status(400).json({ message: 'Dona narxi kiritilishi shart' });
      }
      
      const priceValidation = validatePrice(price_per_piece, sale_currency);
      if (!priceValidation.valid) {
        return res.status(400).json({ message: priceValidation.error });
      }
      
    } else {
      if (!dispatchedVolume) {
        return res.status(400).json({ message: 'Hajm kiritilishi shart' });
      }
      
      const volumeValidation = validateLotVolume(lotDoc, dispatchedVolume, null, 'volume');
      if (!volumeValidation.valid) {
        return res.status(400).json({ message: volumeValidation.error });
      }
      
      // Transport yo'qotishi validatsiyasi
      const lossValidation = validateTransportLoss(dispatchedVolume, transportLoss);
      if (!lossValidation.valid) {
        return res.status(400).json({ message: lossValidation.error });
      }
      
      // Narx validatsiyasi
      if (!price_per_m3) {
        return res.status(400).json({ message: 'm³ narxi kiritilishi shart' });
      }
      
      const priceValidation = validatePrice(price_per_m3, sale_currency, lotDoc.cost_per_m3);
      if (!priceValidation.valid) {
        return res.status(400).json({ message: priceValidation.error });
      }
      
      if (priceValidation.warning) {
        logger.warn(`⚠️ ${priceValidation.warning}`);
      }
    }
    
    // To'lov validatsiyasi (agar total_price hisoblangan bo'lsa)
    if (paid_amount && req.body.total_price) {
      const paymentValidation = validatePayment(paid_amount, req.body.total_price, sale_currency);
      if (!paymentValidation.valid) {
        return res.status(400).json({ message: paymentValidation.error });
      }
    }
    
    // Validatsiya muvaffaqiyatli - davom ettirish
    next();
    
  } catch (error) {
    logger.error('❌ Validatsiya xatoligi:', error);
    res.status(500).json({ 
      message: 'Validatsiya xatoligi',
      error: error.message
    });
  }
}

module.exports = {
  validateLotVolume,
  validateTransportLoss,
  validatePrice,
  validatePayment,
  validateVagonSaleRequest
};
