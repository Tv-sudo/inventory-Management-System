const { AuditLog, User } = require('../models/index');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await AuditLog.findAll({
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'fullName', 'email', 'role'], required: false },
      ],
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
