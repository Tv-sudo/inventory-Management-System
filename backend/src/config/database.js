const { Sequelize } = require('sequelize');
const { recordSlowQuery } = require('../monitoring/metricsStore');
require('dotenv').config();

const slowQueryMs = Number(process.env.SLOW_QUERY_MS || 500);
const logSql = process.env.LOG_SQL === 'true';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    benchmark: true,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
      idle: Number(process.env.DB_POOL_IDLE_MS || 10000),
    },
    logging: (sql, durationMs) => {
      if (durationMs >= slowQueryMs) {
        recordSlowQuery({ sql, durationMs });
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'slow_query',
          durationMs,
          sql: String(sql).slice(0, 1000),
        }));
      } else if (logSql) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'sql',
          durationMs,
          sql,
        }));
      }
    },
  }
);

module.exports = sequelize;
