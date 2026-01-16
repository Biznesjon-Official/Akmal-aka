const AuditLog = require('../models/AuditLog');

// Audit log yaratish
const createAuditLog = async (action, model, documentId, changes, user, req) => {
  try {
    await AuditLog.create({
      action,
      model,
      documentId,
      changes,
      user: user._id || user,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
  } catch (error) {
    console.error('Audit log xatosi:', error);
    // Audit log xatosi asosiy operatsiyani to'xtatmasligi kerak
  }
};

// Middleware - create uchun
const auditCreate = (modelName) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data) {
        const documentId = data._id || data.id;
        if (documentId) {
          createAuditLog(
            'create',
            modelName,
            documentId,
            { after: data },
            req.user,
            req
          );
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

// Middleware - update uchun
const auditUpdate = (modelName) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data) {
        const documentId = req.params.id || data._id || data.id;
        if (documentId) {
          createAuditLog(
            'update',
            modelName,
            documentId,
            {
              before: req.originalData, // Route'da set qilinadi
              after: data
            },
            req.user,
            req
          );
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

// Middleware - delete uchun
const auditDelete = (modelName) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const documentId = req.params.id;
        if (documentId) {
          createAuditLog(
            'delete',
            modelName,
            documentId,
            {
              before: req.originalData,
              after: null
            },
            req.user,
            req
          );
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = {
  createAuditLog,
  auditCreate,
  auditUpdate,
  auditDelete
};
