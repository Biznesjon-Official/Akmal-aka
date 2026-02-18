const ExchangeRate = require('../models/ExchangeRate');

/**
 * Faol valyuta kursini olish
 * @param {String} from_currency - Qaysi valyutadan
 * @param {String} to_currency - Qaysi valyutaga
 * @returns {Number} - Kurs qiymati
 */
async function getActiveExchangeRate(from_currency, to_currency) {
  const rate = await ExchangeRate.findOne({
    from_currency,
    to_currency,
    is_active: true
  }).sort({ effective_date: -1 });
  
  if (!rate) {
    throw new Error(`Faol kurs topilmadi: ${from_currency} -> ${to_currency}`);
  }
  
  return rate.rate;
}

/**
 * Yangi valyuta kursini o'rnatish
 * @param {String} from_currency - Qaysi valyutadan
 * @param {String} to_currency - Qaysi valyutaga
 * @param {Number} rate - Kurs qiymati
 * @param {String} user_id - Foydalanuvchi ID
 * @param {String} notes - Izoh (ixtiyoriy)
 * @returns {Object} - Yangi kurs
 */
async function setExchangeRate(from_currency, to_currency, rate, user_id, notes = '') {
  // Validatsiya
  if (!from_currency || !to_currency) {
    throw new Error('Valyutalar kiritilishi shart');
  }
  
  if (from_currency === to_currency) {
    throw new Error('Bir xil valyutaga kurs o\'rnatish mumkin emas');
  }
  
  if (!rate || rate <= 0) {
    throw new Error('Kurs qiymati 0 dan katta bo\'lishi kerak');
  }
  
  // Eski kurslarni deactivate qilish
  await ExchangeRate.updateMany(
    { 
      from_currency, 
      to_currency, 
      is_active: true 
    },
    { 
      is_active: false 
    }
  );
  
  // Yangi kurs yaratish
  const rateData = {
    from_currency,
    to_currency,
    rate,
    is_active: true,
    source: 'manual',
    notes
  };
  
  // Hardcoded admin uchun created_by ni handle qilish
  if (user_id && user_id !== 'hardcoded-admin-id') {
    rateData.created_by = user_id;
  }
  
  const newRate = await ExchangeRate.create(rateData);
  
  return newRate;
}

/**
 * Barcha faol kurslarni olish
 * @returns {Array} - Faol kurslar ro'yxati
 */
async function getAllActiveRates() {
  const rates = await ExchangeRate.find({ is_active: true })
    .populate('created_by', 'username')
    .sort({ from_currency: 1, to_currency: 1 })
    .lean();
  
  return rates;
}

/**
 * Kurs tarixini olish
 * @param {String} from_currency - Qaysi valyutadan (ixtiyoriy)
 * @param {String} to_currency - Qaysi valyutaga (ixtiyoriy)
 * @param {Number} limit - Limit (default: 50)
 * @returns {Array} - Kurs tarixi
 */
async function getRateHistory(from_currency = null, to_currency = null, limit = 50) {
  const query = {};
  
  if (from_currency) {
    query.from_currency = from_currency;
  }
  
  if (to_currency) {
    query.to_currency = to_currency;
  }
  
  const history = await ExchangeRate.find(query)
    .populate('created_by', 'username')
    .sort({ effective_date: -1 })
    .limit(limit)
    .lean();
  
  return history;
}

/**
 * Summa konvertatsiya qilish
 * @param {Number} amount - Summa
 * @param {String} from_currency - Qaysi valyutadan
 * @param {String} to_currency - Qaysi valyutaga
 * @returns {Number} - Konvertatsiya qilingan summa
 */
async function convertAmount(amount, from_currency, to_currency) {
  if (from_currency === to_currency) {
    return amount;
  }
  
  const rate = await getActiveExchangeRate(from_currency, to_currency);
  return amount * rate;
}

module.exports = {
  getActiveExchangeRate,
  setExchangeRate,
  getAllActiveRates,
  getRateHistory,
  convertAmount
};
