const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');

class ExchangeRateService {
  constructor() {
    this.apiKey = process.env.EXCHANGE_API_KEY || null;
    this.baseUrl = 'https://api.exchangerate-api.com/v4/latest';
    this.fallbackUrl = 'https://api.fixer.io/latest';
    this.updateInterval = 30 * 60 * 1000; // 30 daqiqa
    this.isUpdating = false;
  }

  // Real-time kurslarni olish
  async fetchRealTimeRates() {
    try {
      // USD asosida kurslarni olish
      const response = await axios.get(`${this.baseUrl}/USD`, {
        timeout: 10000
      });

      if (response.data && response.data.rates) {
        return {
          USD_TO_RUB: response.data.rates.RUB || null,
          RUB_TO_USD: response.data.rates.RUB ? (1 / response.data.rates.RUB) : null,
          lastUpdated: new Date(response.data.date || Date.now())
        };
      }

      throw new Error('Invalid API response');
    } catch (error) {
      console.error('Real-time kurs olishda xatolik:', error.message);
      
      // Fallback API
      try {
        const fallbackResponse = await axios.get(`${this.fallbackUrl}?base=USD`, {
          timeout: 10000
        });

        if (fallbackResponse.data && fallbackResponse.data.rates) {
          return {
            USD_TO_RUB: fallbackResponse.data.rates.RUB || null,
            RUB_TO_USD: fallbackResponse.data.rates.RUB ? (1 / fallbackResponse.data.rates.RUB) : null,
            lastUpdated: new Date(fallbackResponse.data.date || Date.now())
          };
        }
      } catch (fallbackError) {
        console.error('Fallback API ham ishlamadi:', fallbackError.message);
      }

      return null;
    }
  }

  // Database dagi kurslarni yangilash
  async updateDatabaseRates(realTimeRates, adminUserId = null) {
    if (!realTimeRates) return false;

    try {
      const updates = [];

      // USD kursi (1 USD = X RUB)
      if (realTimeRates.USD_TO_RUB) {
        updates.push(
          ExchangeRate.findOneAndUpdate(
            { currency: 'USD' },
            {
              rate: realTimeRates.USD_TO_RUB,
              lastUpdated: realTimeRates.lastUpdated,
              updatedBy: adminUserId,
              isRealTime: true
            },
            { upsert: true, new: true }
          )
        );
      }

      // RUB kursi (1 RUB = X USD)
      if (realTimeRates.RUB_TO_USD) {
        updates.push(
          ExchangeRate.findOneAndUpdate(
            { currency: 'RUB' },
            {
              rate: realTimeRates.RUB_TO_USD,
              lastUpdated: realTimeRates.lastUpdated,
              updatedBy: adminUserId,
              isRealTime: true
            },
            { upsert: true, new: true }
          )
        );
      }

      await Promise.all(updates);
      console.log('✅ Real-time kurslar yangilandi:', {
        USD_TO_RUB: realTimeRates.USD_TO_RUB,
        RUB_TO_USD: realTimeRates.RUB_TO_USD
      });

      return true;
    } catch (error) {
      console.error('Database yangilashda xatolik:', error.message);
      return false;
    }
  }

  // Avtomatik yangilashni boshlash
  startAutoUpdate(adminUserId = null) {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // Dastlab bir marta yangilash
    this.updateRates(adminUserId);

    // Keyin muntazam yangilash
    this.updateTimer = setInterval(() => {
      this.updateRates(adminUserId);
    }, this.updateInterval);

    console.log('🔄 Real-time valyuta kurslari avtomatik yangilanishi boshlandi');
  }

  // Avtomatik yangilashni to'xtatish
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('⏹️ Real-time valyuta kurslari avtomatik yangilanishi to\'xtatildi');
    }
  }

  // Kurslarni yangilash
  async updateRates(adminUserId = null) {
    if (this.isUpdating) {
      console.log('⏳ Kurslar allaqachon yangilanmoqda...');
      return;
    }

    this.isUpdating = true;

    try {
      const realTimeRates = await this.fetchRealTimeRates();
      if (realTimeRates) {
        await this.updateDatabaseRates(realTimeRates, adminUserId);
      }
    } catch (error) {
      console.error('Kurslarni yangilashda xatolik:', error.message);
    } finally {
      this.isUpdating = false;
    }
  }

  // Joriy kurslarni olish (database + real-time)
  async getCurrentRates() {
    try {
      const dbRates = await ExchangeRate.find().populate('updatedBy', 'username');
      const realTimeRates = await this.fetchRealTimeRates();

      return {
        database: dbRates,
        realTime: realTimeRates,
        lastFetch: new Date()
      };
    } catch (error) {
      console.error('Kurslarni olishda xatolik:', error.message);
      return {
        database: await ExchangeRate.find().populate('updatedBy', 'username'),
        realTime: null,
        lastFetch: new Date()
      };
    }
  }
}

module.exports = new ExchangeRateService();