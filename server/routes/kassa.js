const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Kassa = require('../models/Kassa');
const auth = require('../middleware/auth');
const { createAuditLog } = require('../middleware/auditLog');

const router = express.Router();

// Barcha kassa tranzaksiyalarini olish
router.get('/', auth, async (req, res) => {
  try {
    const { turi, valyuta, page = 1, limit = 10, startDate, endDate } = req.query;
    const filter = { isDeleted: false }; // Soft delete filter qo'shildi
    
    if (turi) filter.turi = turi;
    if (valyuta) filter.valyuta = valyuta;
    
    // Sana filtri
    if (startDate || endDate) {
      filter.sana = {};
      if (startDate) filter.sana.$gte = new Date(startDate);
      if (endDate) filter.sana.$lte = new Date(endDate);
    }
    
    const kassaList = await Kassa.find(filter)
      .populate('woodLot', 'lotCode')
      .populate('purchase', '_id')
      .populate('sale', '_id')
      .populate('expense', '_id')
      .populate('yaratuvchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sana: -1 });
    
    const total = await Kassa.countDocuments(filter);
    
    res.json({
      kassa: kassaList, // Frontend 'kassa' kutmoqda
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi kassa tranzaksiyasi qo'shish - TRANSACTION bilan
router.post('/', [auth, [
  body('turi').isIn(['otpr', 'prixod', 'rasxod', 'klent_prixod']).withMessage('Noto\'g\'ri tranzaksiya turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB', 'UZS']).withMessage('Noto\'g\'ri valyuta'),
  body('summaUZS').isNumeric().withMessage('UZS summasi raqam bo\'lishi kerak'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      console.log('❌ Validation xatolari:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const kassaData = {
      ...req.body,
      yaratuvchi: req.user.userId
    };

    const kassa = await Kassa.create([kassaData], { session });
    
    // Audit log
    await createAuditLog(
      'create',
      'Kassa',
      kassa[0]._id,
      { after: kassa[0].toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await kassa[0].populate([
      { path: 'woodLot', select: 'lotCode' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.status(201).json(kassa[0]);
  } catch (error) {
    await session.abortTransaction();
    console.error('Kassa yaratishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Kassa balansini hisoblash
router.get('/balance', auth, async (req, res) => {
  try {
    const { valyuta } = req.query;
    const filter = { isDeleted: false }; // Soft delete filter qo'shildi
    if (valyuta) filter.valyuta = valyuta;
    
    const balanceData = await Kassa.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$valyuta',
          otpr: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'otpr'] }, '$summa', 0]
            }
          },
          prixod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'prixod'] }, '$summa', 0]
            }
          },
          rasxod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          },
          klentPrixod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'klent_prixod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          chistiyPrixod: {
            $subtract: [
              { $add: ['$otpr', '$prixod', '$klentPrixod'] },
              '$rasxod'
            ]
          }
        }
      }
    ]);
    
    res.json(balanceData);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa tranzaksiyasini yangilash - TRANSACTION bilan
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const kassa = await Kassa.findById(req.params.id).session(session);
    if (!kassa) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Kassa tranzaksiyasi topilmadi' });
    }
    
    const oldData = kassa.toObject();
    
    Object.assign(kassa, req.body);
    await kassa.save({ session });
    
    // Audit log
    await createAuditLog(
      'update',
      'Kassa',
      kassa._id,
      { before: oldData, after: kassa.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await kassa.populate([
      { path: 'woodLot', select: 'lotCode' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.json(kassa);
  } catch (error) {
    await session.abortTransaction();
    console.error('Kassa yangilashda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Kassa tranzaksiyasini o'chirish (SOFT DELETE) - TRANSACTION bilan
router.delete('/:id', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const kassa = await Kassa.findById(req.params.id).session(session);
    if (!kassa) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Kassa tranzaksiyasi topilmadi' });
    }
    
    // Soft delete
    kassa.isDeleted = true;
    kassa.deletedAt = new Date();
    kassa.deletedBy = req.user.userId;
    kassa.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    await kassa.save({ session });
    
    // Audit log
    await createAuditLog(
      'delete',
      'Kassa',
      kassa._id,
      { before: kassa.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    res.json({ message: 'Kassa tranzaksiyasi arxivlandi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Kassa o\'chirishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;