const mongoose = require('mongoose');
const CurrencyTransfer = require('../models/CurrencyTransfer');
const Cash = require('../models/Cash');
const ExchangeRate = require('../models/ExchangeRate');

/**
 * Valyuta o'tkazish
 * @param {Object} params - O'tkazma parametrlari
 * @param {String} params.from_currency - Qaysi valyutadan (USD/RUB)
 * @param {String} params.to_currency - Qaysi valyutaga (USD/RUB)
 * @param {Number} params.from_amount - O'tkaziladigan summa
 * @param {String} params.user_id - Foydalanuvchi ID
 * @param {String} params.notes - Izoh (ixtiyoriy)
 * @param {Object} session - MongoDB session (transaction uchun)
 * @returns {Object} - Yaratilgan CurrencyTransfer
 */
async function transferCurrency({
  from_currency,
  to_currency,
  from_amount,
  user_id,
  notes = '',
  session
}) {
  try {
    // 1. Validatsiya
    if (!from_currency || !to_currency) {
      throw new Error('Valyutalar kiritilishi shart');
    }
    
    if (from_currency === to_currency) {
      throw new Error('Bir xil valyutaga o\'tkazish mumkin emas');
    }
    
    if (!from_amount || from_amount <= 0) {
      throw new Error('O\'tkaziladigan summa 0 dan katta bo\'lishi kerak');
    }
    
    if (!user_id) {
      throw new Error('Foydalanuvchi ID kiritilishi shart');
    }
    
    // 2. Joriy kursni olish
    const rate = await ExchangeRate.getActiveRate(from_currency, to_currency);
    
    // 3. Konvertatsiya qilish
    const to_amount = from_amount * rate;
    
    // 4. Balansni tekshirish
    const balance = await getBalanceByCurrency(from_currency);
    if (balance < from_amount) {
      throw new Error(`${from_currency} hisobida yetarli mablag' yo'q. Mavjud: ${balance.toFixed(2)}, Kerak: ${from_amount.toFixed(2)}`);
    }
    
    // 5. CurrencyTransfer yaratish
    const transfer = await CurrencyTransfer.create([{
      from_currency,
      to_currency,
      from_amount,
      to_amount,
      exchange_rate: rate,
      notes,
      created_by: user_id,
      status: 'completed'
    }], { session });
    
    // 6. Cash yozuvlarini yaratish
    // Chiqim (from_currency)
    const cashOut = await Cash.create([{
      type: 'currency_transfer_out',
      amount: from_amount,
      currency: from_currency,
      description: `Valyuta o'tkazmasi: ${from_currency} -> ${to_currency}`,
      currencyTransfer: transfer[0]._id,
      transaction_date: new Date(),
      createdBy: user_id
    }], { session });
    
    // Kirim (to_currency)
    const cashIn = await Cash.create([{
      type: 'currency_transfer_in',
      amount: to_amount,
      currency: to_currency,
      description: `Valyuta o'tkazmasi: ${from_currency} -> ${to_currency}`,
      currencyTransfer: transfer[0]._id,
      transaction_date: new Date(),
      createdBy: user_id
    }], { session });
    
    // 7. CurrencyTransfer'ga Cash ID'larni qo'shish
    transfer[0].cash_out_id = cashOut[0]._id;
    transfer[0].cash_in_id = cashIn[0]._id;
    await transfer[0].save({ session });
    
    return transfer[0];
  } catch (error) {
    throw error;
  }
}

/**
 * Valyuta bo'yicha balansni olish
 * @param {String} currency - Valyuta (USD/RUB)
 * @returns {Number} - Balans
 */
async function getBalanceByCurrency(currency) {
  const result = await Cash.aggregate([
    { 
      $match: { 
        currency,
        isDeleted: false 
      } 
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  let income = 0;
  let expense = 0;
  
  result.forEach(item => {
    // Kirim turlari
    if (['client_payment', 'initial_balance', 'delivery_payment', 'debt_sale', 'vagon_sale', 'debt_payment', 'currency_transfer_in'].includes(item._id)) {
      income += item.total;
    }
    // Chiqim turlari
    else if (['expense', 'delivery_expense', 'currency_transfer_out'].includes(item._id)) {
      expense += item.total;
    }
  });
  
  return income - expense;
}

/**
 * Barcha valyutalar bo'yicha balansni olish
 * @returns {Object} - { USD: balance, RUB: balance }
 */
async function getAllBalances() {
  const currencies = ['USD', 'RUB'];
  const balances = {};
  
  for (const currency of currencies) {
    balances[currency] = await getBalanceByCurrency(currency);
  }
  
  return balances;
}

/**
 * O'tkazmalar tarixini olish
 * @param {Object} filters - Filtrlar
 * @returns {Array} - O'tkazmalar ro'yxati
 */
async function getTransferHistory(filters = {}) {
  const query = { isDeleted: false };
  
  if (filters.from_currency) {
    query.from_currency = filters.from_currency;
  }
  
  if (filters.to_currency) {
    query.to_currency = filters.to_currency;
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.start_date && filters.end_date) {
    query.transfer_date = {
      $gte: new Date(filters.start_date),
      $lte: new Date(filters.end_date)
    };
  }
  
  const transfers = await CurrencyTransfer.find(query)
    .populate('created_by', 'username')
    .sort({ transfer_date: -1 })
    .lean();
  
  return transfers;
}

module.exports = {
  transferCurrency,
  getBalanceByCurrency,
  getAllBalances,
  getTransferHistory
};
