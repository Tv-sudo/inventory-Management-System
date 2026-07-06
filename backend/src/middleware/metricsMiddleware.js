const { recordRequest } = require('../monitoring/metricsStore');

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    recordRequest({
      req,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
};

module.exports = metricsMiddleware;
