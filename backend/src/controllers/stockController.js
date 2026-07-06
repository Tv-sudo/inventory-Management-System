const { Op, where, col } = require('sequelize');
const { StockItem } = require('../models/index');
const { writeAuditLog } = require('../services/auditService');

const stockFields = ['name', 'category', 'quantity', 'minimumQuantity', 'unitCost', 'location', 'unit'];
const pick = (source, fields) => Object.fromEntries(
  fields.filter((field) => Object.prototype.hasOwnProperty.call(source, field)).map((field) => [field, source[field]])
);

exports.createStockItem = async (req, res, next) => {
  try {
    const item = await StockItem.create(pick(req.body, stockFields));
    await writeAuditLog({
      req,
      action: 'stock.create',
      tableName: 'StockItems',
      recordId: item.id,
      newValues: item,
    });
    res.status(201).json({ message: 'Stock item created.', item });
  } catch (err) {
    next(err);
  }
};

exports.getAllStockItems = async (req, res, next) => {
  try {
    const items = await StockItem.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.updateStockItem = async (req, res, next) => {
  try {
    const item = await StockItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Stock item not found.' });

    const oldValues = item.toJSON();
    await item.update(pick(req.body, stockFields));

    await writeAuditLog({
      req,
      action: 'stock.update',
      tableName: 'StockItems',
      recordId: item.id,
      oldValues,
      newValues: item,
    });

    res.json({ message: 'Stock item updated.', item });
  } catch (err) {
    next(err);
  }
};

exports.getLowStockItems = async (req, res, next) => {
  try {
    const items = await StockItem.findAll({
      where: where(col('quantity'), { [Op.lte]: col('minimumQuantity') }),
      order: [['quantity', 'ASC']],
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
};
