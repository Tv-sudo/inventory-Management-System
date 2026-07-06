const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const sequelize = require('./src/config/database');
require('./src/models/index');

const authRoutes = require('./src/routes/authRoutes');
const assetRoutes = require('./src/routes/assetRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const maintenanceRoutes = require('./src/routes/maintenanceRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const metricsRoutes = require('./src/routes/metricsRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/requestLogger');
const metricsMiddleware = require('./src/middleware/metricsMiddleware');
const { snapshot } = require('./src/monitoring/metricsStore');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json({ limit: '25kb' }));
app.use(requestLogger);
app.use(metricsMiddleware);

if (!isProd) {
  app.use(morgan('dev'));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300),
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WRITE_MAX || 60),
  message: { message: 'Too many write requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 10),
  message: { message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use(['/api/assets', '/api/transactions', '/api/maintenance', '/api/stock'], writeLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', message: 'Database unavailable', requestId: req.id });
  }
});

app.get('/metrics-public-summary', (req, res) => {
  const data = snapshot();
  res.json({
    service: data.service,
    uptimeSeconds: data.uptimeSeconds,
    requestsTotal: data.requestsTotal,
    errorsTotal: data.errorsTotal,
    errorRate: data.errorRate,
    averageLatencyMs: data.averageLatencyMs,
    maxLatencyMs: data.maxLatencyMs,
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Inventory Management System API',
    version: '1.0.0',
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/audit-logs', auditRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found`, requestId: req.id });
});

app.use(errorHandler);

sequelize.authenticate()
  .then(async () => {
    console.log('Database connected successfully');

    if (!isProd && process.env.SYNC_DB === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Database synced for development');
    }

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Allowed client origin: ${clientOrigin}`);
      console.log(`Admin metrics endpoint: /api/metrics`);
      console.log(`Admin audit endpoint: /api/audit-logs`);
      console.log(`Readiness endpoint: /ready`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
