const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const { writeAuditLog } = require('../services/auditService');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

const safeUserJson = (user) => {
  const data = user.toJSON();
  delete data.password;
  delete data.loginAttempts;
  delete data.lockedUntil;
  return data;
};

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName,
      email,
      password: hashed,
      role: 'standard_user',
      isApproved: false,
      isActive: true,
    });

    await writeAuditLog({
      req,
      action: 'user.register',
      tableName: 'Users',
      recordId: user.id,
      newValues: user,
    });

    res.status(201).json({
      message: 'Registration successful. Your account is pending admin approval.',
    });
  } catch (err) {
    next(err);
  }
};

exports.createUserByAdmin = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email,
      password: hashed,
      role,
      isApproved: true,
      isActive: true,
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    await writeAuditLog({
      req,
      action: 'user.create_by_admin',
      tableName: 'Users',
      recordId: user.id,
      newValues: user,
    });

    res.status(201).json({
      message: 'User created successfully.',
      user: safeUserJson(user),
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid email or password.' });

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(423).json({ message: `Account locked. Try again in ${minutesLeft} minutes.` });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      const attempts = (user.loginAttempts || 0) + 1;
      const updateData = { loginAttempts: attempts };

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_TIME);
        updateData.loginAttempts = 0;
        await user.update(updateData);
        return res.status(423).json({ message: 'Too many failed attempts. Account locked for 15 minutes.' });
      }

      await user.update(updateData);
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Your account is pending approval.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    await user.update({ loginAttempts: 0, lockedUntil: null, lastLogin: new Date() });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '2h', algorithm: 'HS256' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'loginAttempts', 'lockedUntil'] },
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'loginAttempts', 'lockedUntil'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getPendingUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { isApproved: false },
      attributes: { exclude: ['password', 'loginAttempts', 'lockedUntil'] },
      order: [['createdAt', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const oldValues = user.toJSON();
    await user.update({
      isApproved: true,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      role: req.body.role || user.role,
    });

    await writeAuditLog({
      req,
      action: 'user.approve',
      tableName: 'Users',
      recordId: user.id,
      oldValues,
      newValues: user,
    });

    res.json({ message: `${user.fullName} has been approved successfully.`, user: safeUserJson(user) });
  } catch (err) {
    next(err);
  }
};

exports.rejectUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot reject your own account.' });
    }

    const oldValues = user.toJSON();
    await user.destroy();

    await writeAuditLog({
      req,
      action: 'user.reject',
      tableName: 'Users',
      recordId: Number(req.params.id),
      oldValues,
    });

    res.json({ message: 'User registration rejected and removed.' });
  } catch (err) {
    next(err);
  }
};

exports.toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const oldValues = user.toJSON();
    await user.update({ isActive: !user.isActive });

    await writeAuditLog({
      req,
      action: user.isActive ? 'user.activate' : 'user.deactivate',
      tableName: 'Users',
      recordId: user.id,
      oldValues,
      newValues: user,
    });

    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    next(err);
  }
};
