const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Backup papkasini yaratish
const BACKUP_DIR = path.join(__dirname, '../backups');

// Backup papkasi mavjudligini tekshirish
const ensureBackupDir = async () => {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
};

// Barcha collectionlarni backup qilish
router.post('/create', [auth, auth.adminOnly], async (req, res) => {
  try {
    await ensureBackupDir();

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      database: db.databaseName,
      collections: {}
    };

    // Har bir collection'ni backup qilish
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      backup.collections[collectionName] = documents;
    }

    // Backup faylini saqlash
    const filename = `backup_${Date.now()}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(backup, null, 2));

    res.json({
      message: 'Backup muvaffaqiyatli yaratildi',
      filename,
      size: (await fs.stat(filepath)).size,
      collections: Object.keys(backup.collections).length,
      timestamp: backup.timestamp
    });
  } catch (error) {
    console.error('Backup yaratishda xato:', error);
    res.status(500).json({ message: 'Backup yaratishda xato', error: error.message });
  }
});

// Barcha backuplarni ko'rish
router.get('/list', [auth, auth.adminOnly], async (req, res) => {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filepath);
        
        // Backup faylini o'qib, ma'lumotlarni olish
        const content = await fs.readFile(filepath, 'utf8');
        const data = JSON.parse(content);
        
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          timestamp: data.timestamp,
          collections: Object.keys(data.collections || {}).length,
          database: data.database
        });
      }
    }

    // Eng yangi backuplar birinchi
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ backups, total: backups.length });
  } catch (error) {
    console.error('Backuplarni olishda xato:', error);
    res.status(500).json({ message: 'Backuplarni olishda xato', error: error.message });
  }
});

// Backup faylini yuklash
router.get('/download/:filename', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(BACKUP_DIR, filename);

    // Xavfsizlik: faqat backup papkasidagi fayllar
    if (!filename.endsWith('.json') || filename.includes('..')) {
      return res.status(400).json({ message: 'Noto\'g\'ri fayl nomi' });
    }

    // Fayl mavjudligini tekshirish
    await fs.access(filepath);

    res.download(filepath, filename);
  } catch (error) {
    console.error('Faylni yuklashda xato:', error);
    res.status(404).json({ message: 'Fayl topilmadi' });
  }
});

// Backupdan tiklash (RESTORE)
router.post('/restore/:filename', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { filename } = req.params;
    const filepath = path.join(BACKUP_DIR, filename);

    // Xavfsizlik tekshiruvi
    if (!filename.endsWith('.json') || filename.includes('..')) {
      return res.status(400).json({ message: 'Noto\'g\'ri fayl nomi' });
    }

    // Backup faylini o'qish
    const content = await fs.readFile(filepath, 'utf8');
    const backup = JSON.parse(content);

    if (!backup.collections) {
      return res.status(400).json({ message: 'Noto\'g\'ri backup fayl formati' });
    }

    await session.startTransaction();

    const db = mongoose.connection.db;
    const restored = {
      collections: 0,
      documents: 0
    };

    // Har bir collection'ni tiklash
    for (const [collectionName, documents] of Object.entries(backup.collections)) {
      if (documents.length > 0) {
        const collection = db.collection(collectionName);
        
        // Eski ma'lumotlarni o'chirish (ehtiyotkorlik bilan!)
        await collection.deleteMany({}, { session });
        
        // Yangi ma'lumotlarni qo'shish
        await collection.insertMany(documents, { session });
        
        restored.collections++;
        restored.documents += documents.length;
      }
    }

    await session.commitTransaction();

    res.json({
      message: 'Backup muvaffaqiyatli tiklandi',
      restored,
      backupDate: backup.timestamp
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Backupni tiklashda xato:', error);
    res.status(500).json({ message: 'Backupni tiklashda xato', error: error.message });
  } finally {
    session.endSession();
  }
});

// Backupni o'chirish
router.delete('/:filename', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(BACKUP_DIR, filename);

    // Xavfsizlik tekshiruvi
    if (!filename.endsWith('.json') || filename.includes('..')) {
      return res.status(400).json({ message: 'Noto\'g\'ri fayl nomi' });
    }

    await fs.unlink(filepath);

    res.json({ message: 'Backup o\'chirildi' });
  } catch (error) {
    console.error('Backupni o\'chirishda xato:', error);
    res.status(404).json({ message: 'Fayl topilmadi' });
  }
});

module.exports = router;
