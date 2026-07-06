const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tableName: {
    type: DataTypes.STRING,
  },
  recordId: {
    type: DataTypes.INTEGER,
  },
  oldValues: {
    type: DataTypes.JSON,
  },
  newValues: {
    type: DataTypes.JSON,
  },
  ipAddress: {
    type: DataTypes.STRING,
  },
  requestId: {
    type: DataTypes.STRING,
  },
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['tableName'] },
    { fields: ['recordId'] },
    { fields: ['createdAt'] },
    { fields: ['requestId'] },
  ],
});

module.exports = AuditLog;
