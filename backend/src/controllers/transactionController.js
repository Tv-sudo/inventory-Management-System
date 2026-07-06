const sequelize = require('../config/database');
const { Transaction, Asset, User } = require('../models/index');
const { writeAuditLog } = require('../services/auditService');

exports.createTransaction = async (req, res, next) => {
  const dbTx = await sequelize.transaction();

  try {
    const { assetId, type, expectedReturnDate, actualReturnDate, conditionAtReturn, notes } = req.body;
    const asset = await Asset.findByPk(assetId, {
      transaction: dbTx,
      lock: dbTx.LOCK.UPDATE,
    });

    if (!asset) {
      await dbTx.rollback();
      return res.status(404).json({ message: 'Asset not found.' });
    }

    if (type === 'checkout' && asset.status !== 'available') {
      await dbTx.rollback();
      return res.status(400).json({ message: 'Asset is not available for checkout.' });
    }

    if (type === 'checkin' && asset.status !== 'checked_out') {
      await dbTx.rollback();
      return res.status(400).json({ message: 'Asset is not checked out.' });
    }

    const oldAssetValues = asset.toJSON();
    const transaction = await Transaction.create({
      assetId,
      userId: req.user.id,
      type,
      expectedReturnDate: type === 'checkout' ? expectedReturnDate : null,
      actualReturnDate: type === 'checkin' ? (actualReturnDate || new Date()) : null,
      conditionAtCheckout: type === 'checkout' ? asset.condition : null,
      conditionAtReturn: type === 'checkin' ? conditionAtReturn : null,
      notes,
    }, { transaction: dbTx });

    await asset.update({
      status: type === 'checkout' ? 'checked_out' : 'available',
      ...(type === 'checkin' && conditionAtReturn ? { condition: conditionAtReturn } : {}),
    }, { transaction: dbTx });

    await writeAuditLog({
      req,
      action: `asset.${type}`,
      tableName: 'Transactions',
      recordId: transaction.id,
      newValues: transaction,
      transaction: dbTx,
    });

    await writeAuditLog({
      req,
      action: `asset_status.${type}`,
      tableName: 'Assets',
      recordId: asset.id,
      oldValues: oldAssetValues,
      newValues: asset,
      transaction: dbTx,
    });

    await dbTx.commit();
    res.status(201).json({ message: `Asset ${type} successful.`, transaction });
  } catch (err) {
    await dbTx.rollback();
    next(err);
  }
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({
      include: [
        { model: Asset, attributes: ['name', 'serialNumber'] },
        { model: User, attributes: ['fullName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
};

exports.getMyTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      include: [{ model: Asset, attributes: ['name', 'serialNumber'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
};
