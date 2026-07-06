const addColumnIfMissing = async (queryInterface, tableName, columnName, definition, transaction) => {
  const table = await queryInterface.describeTable(tableName).catch(() => null);
  if (!table) return false;
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition, { transaction });
  }
  return true;
};

const addIndexIfMissing = async (queryInterface, tableName, fields, name, transaction) => {
  const table = await queryInterface.describeTable(tableName).catch(() => null);
  if (!table) return;

  const indexes = await queryInterface.showIndex(tableName).catch(() => []);
  const exists = indexes.some((index) => index.name === name);
  if (!exists) {
    await queryInterface.addIndex(tableName, fields, { name, transaction });
  }
};

module.exports = {
  async up({ queryInterface, DataTypes, transaction }) {
    const auditExists = await queryInterface.describeTable('AuditLogs').catch(() => null);

    if (!auditExists) {
      await queryInterface.createTable('AuditLogs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: true },
        action: { type: DataTypes.STRING, allowNull: false },
        tableName: { type: DataTypes.STRING, allowNull: true },
        recordId: { type: DataTypes.INTEGER, allowNull: true },
        oldValues: { type: DataTypes.JSON, allowNull: true },
        newValues: { type: DataTypes.JSON, allowNull: true },
        ipAddress: { type: DataTypes.STRING, allowNull: true },
        requestId: { type: DataTypes.STRING, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });
    } else {
      await addColumnIfMissing(queryInterface, 'AuditLogs', 'requestId', {
        type: DataTypes.STRING,
        allowNull: true,
      }, transaction);
    }

    await addIndexIfMissing(queryInterface, 'AuditLogs', ['userId'], 'audit_logs_user_id', transaction);
    await addIndexIfMissing(queryInterface, 'AuditLogs', ['action'], 'audit_logs_action', transaction);
    await addIndexIfMissing(queryInterface, 'AuditLogs', ['tableName'], 'audit_logs_table_name', transaction);
    await addIndexIfMissing(queryInterface, 'AuditLogs', ['recordId'], 'audit_logs_record_id', transaction);
    await addIndexIfMissing(queryInterface, 'AuditLogs', ['requestId'], 'audit_logs_request_id', transaction);
    await addIndexIfMissing(queryInterface, 'AuditLogs', ['createdAt'], 'audit_logs_created_at', transaction);

    await addIndexIfMissing(queryInterface, 'Users', ['email'], 'users_email', transaction);
    await addIndexIfMissing(queryInterface, 'Users', ['role'], 'users_role', transaction);
    await addIndexIfMissing(queryInterface, 'Users', ['isApproved'], 'users_is_approved', transaction);
    await addIndexIfMissing(queryInterface, 'Users', ['isActive'], 'users_is_active', transaction);

    await addIndexIfMissing(queryInterface, 'Assets', ['status'], 'assets_status', transaction);
    await addIndexIfMissing(queryInterface, 'Assets', ['category'], 'assets_category', transaction);
    await addIndexIfMissing(queryInterface, 'Assets', ['location'], 'assets_location', transaction);
    await addIndexIfMissing(queryInterface, 'Assets', ['createdAt'], 'assets_created_at', transaction);

    await addIndexIfMissing(queryInterface, 'Transactions', ['assetId'], 'transactions_asset_id', transaction);
    await addIndexIfMissing(queryInterface, 'Transactions', ['userId'], 'transactions_user_id', transaction);
    await addIndexIfMissing(queryInterface, 'Transactions', ['type'], 'transactions_type', transaction);
    await addIndexIfMissing(queryInterface, 'Transactions', ['createdAt'], 'transactions_created_at', transaction);
    await addIndexIfMissing(queryInterface, 'Transactions', ['expectedReturnDate'], 'transactions_expected_return_date', transaction);

    await addIndexIfMissing(queryInterface, 'MaintenanceRecords', ['assetId'], 'maintenance_asset_id', transaction);
    await addIndexIfMissing(queryInterface, 'MaintenanceRecords', ['status'], 'maintenance_status', transaction);
    await addIndexIfMissing(queryInterface, 'MaintenanceRecords', ['scheduledDate'], 'maintenance_scheduled_date', transaction);
    await addIndexIfMissing(queryInterface, 'MaintenanceRecords', ['createdAt'], 'maintenance_created_at', transaction);

    await addIndexIfMissing(queryInterface, 'StockItems', ['category'], 'stock_items_category', transaction);
    await addIndexIfMissing(queryInterface, 'StockItems', ['location'], 'stock_items_location', transaction);
    await addIndexIfMissing(queryInterface, 'StockItems', ['quantity'], 'stock_items_quantity', transaction);
    await addIndexIfMissing(queryInterface, 'StockItems', ['minimumQuantity'], 'stock_items_minimum_quantity', transaction);
  },
};
