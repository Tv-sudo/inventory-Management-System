const { AuditLog } = require('../models/index');

const sanitize = (value) => {
  if (!value) return value;
  const data = typeof value.toJSON === 'function' ? value.toJSON() : { ...value };

  delete data.password;
  delete data.loginAttempts;
  delete data.lockedUntil;

  return data;
};

const writeAuditLog = async ({
  req,
  action,
  tableName,
  recordId,
  oldValues = null,
  newValues = null,
  transaction = null,
}) => {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      action,
      tableName,
      recordId,
      oldValues: sanitize(oldValues),
      newValues: sanitize(newValues),
      ipAddress: req.ip,
      requestId: req.id,
    }, transaction ? { transaction } : undefined);
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'audit_log_failed',
      requestId: req.id,
      action,
      tableName,
      recordId,
      message: err.message,
    }));
  }
};

module.exports = {
  writeAuditLog,
};
