const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Audit log yaratish funksiyasi
 * @param {String} userId - Foydalanuvchi ID
 * @param {String} username - Foydalanuvchi nomi
 * @param {String} action - Harakat turi (CREATE, UPDATE, DELETE, VIEW)
 * @param {String} resourceType - Resurs turi (Vagon, VagonLot, etc.)
 * @param {String} resourceId - Resurs ID
 * @param {Object} oldData - Eski ma'lumotlar (UPDATE va DELETE uchun)
 * @param {Object} newData - Yangi ma'lumotlar (CREATE va UPDATE uchun)
 * @param {String} description - Tavsif
 * @param {Object} req - Request obyekti (IP, User-Agent uchun)
 * @param {Object} context - Qo'shimcha kontekst
 */
const createAuditLog = async (
  userId, 
  username, 
  action, 
  resourceType, 
  resourceId, 
  oldData = null, 
  newData = null, 
  description = '', 
  req = null,
  context = {}
) => {
  try {
    const logData = {
      user: userId,
      username: username,
      action: action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_data: oldData,
      new_data: newData,
      description: description || `${action} ${resourceType}`,
      context: context
    };

    // Request ma'lumotlarini qo'shish
    if (req) {
      logData.ip_address = req.ip || req.connection.remoteAddress;
      logData.user_agent = req.get('User-Agent');
      logData.session_id = req.sessionID;
    }

    await AuditLog.createLog(logData);
  } catch (error) {
    logger.error('Audit log yaratishda xatolik:', error);
    // Xatolik asosiy jarayonni to'xtatmasligi kerak
  }
};

/**
 * Express middleware - avtomatik audit log
 */
const auditMiddleware = (resourceType) => {
  return async (req, res, next) => {
    // Response'ni kuzatish uchun
    const originalSend = res.send;
    
    res.send = function(data) {
      // Muvaffaqiyatli operatsiyalarni log qilish
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = getActionFromMethod(req.method);
        const resourceId = req.params.id || 'unknown';
        
        if (req.user) {
          createAuditLog(
            req.user.userId,
            req.user.username || 'Unknown',
            action,
            resourceType,
            resourceId,
            req.body.oldData || null,
            req.body,
            `${action} ${resourceType} via API`,
            req
          );
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * HTTP method'dan action aniqlash
 */
const getActionFromMethod = (method) => {
  switch (method.toUpperCase()) {
    case 'POST': return 'CREATE';
    case 'PUT': 
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    case 'GET': return 'VIEW';
    default: return 'UNKNOWN';
  }
};

/**
 * Manual audit log (route'larda ishlatish uchun)
 */
const logUserAction = async (req, action, resourceType, resourceId, oldData, newData, description, context = {}) => {
  if (req.user) {
    await createAuditLog(
      req.user.userId,
      req.user.username || 'Unknown',
      action,
      resourceType,
      resourceId,
      oldData,
      newData,
      description,
      req,
      context
    );
  }
};

module.exports = {
  createAuditLog,
  auditMiddleware,
  logUserAction
};