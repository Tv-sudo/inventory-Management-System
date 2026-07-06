const startedAt = new Date();

const metrics = {
  startedAt,
  requestsTotal: 0,
  responsesByStatus: {},
  responsesByRoute: {},
  errorsTotal: 0,
  slowRequestsTotal: 0,
  requestDurationMs: {
    count: 0,
    total: 0,
    max: 0,
    buckets: {
      le_50: 0,
      le_100: 0,
      le_250: 0,
      le_500: 0,
      le_1000: 0,
      le_2500: 0,
      gt_2500: 0,
    },
  },
  db: {
    slowQueriesTotal: 0,
    lastSlowQueries: [],
  },
};

const routeKey = (req) => {
  const routePath = req.route?.path || req.path || req.originalUrl || 'unknown';
  const base = req.baseUrl || '';
  return `${req.method} ${base}${routePath}`;
};

const bucketDuration = (durationMs) => {
  if (durationMs <= 50) return 'le_50';
  if (durationMs <= 100) return 'le_100';
  if (durationMs <= 250) return 'le_250';
  if (durationMs <= 500) return 'le_500';
  if (durationMs <= 1000) return 'le_1000';
  if (durationMs <= 2500) return 'le_2500';
  return 'gt_2500';
};

const recordRequest = ({ req, statusCode, durationMs }) => {
  metrics.requestsTotal += 1;

  const statusFamily = `${Math.floor(statusCode / 100)}xx`;
  metrics.responsesByStatus[statusFamily] = (metrics.responsesByStatus[statusFamily] || 0) + 1;

  const key = routeKey(req);
  if (!metrics.responsesByRoute[key]) {
    metrics.responsesByRoute[key] = {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      lastStatusCode: null,
    };
  }

  const route = metrics.responsesByRoute[key];
  route.count += 1;
  route.totalDurationMs += durationMs;
  route.maxDurationMs = Math.max(route.maxDurationMs, durationMs);
  route.lastStatusCode = statusCode;

  if (statusCode >= 500) {
    metrics.errorsTotal += 1;
    route.errors += 1;
  }

  if (durationMs >= Number(process.env.SLOW_REQUEST_MS || 1000)) {
    metrics.slowRequestsTotal += 1;
  }

  const duration = metrics.requestDurationMs;
  duration.count += 1;
  duration.total += durationMs;
  duration.max = Math.max(duration.max, durationMs);
  duration.buckets[bucketDuration(durationMs)] += 1;
};

const recordSlowQuery = ({ sql, durationMs }) => {
  metrics.db.slowQueriesTotal += 1;
  metrics.db.lastSlowQueries.unshift({
    timestamp: new Date().toISOString(),
    durationMs,
    sql: String(sql).slice(0, 1000),
  });
  metrics.db.lastSlowQueries = metrics.db.lastSlowQueries.slice(0, 20);
};

const snapshot = () => {
  const uptimeSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
  const memory = process.memoryUsage();
  const duration = metrics.requestDurationMs;

  return {
    service: 'inventory-management-api',
    startedAt: startedAt.toISOString(),
    uptimeSeconds,
    requestsTotal: metrics.requestsTotal,
    errorsTotal: metrics.errorsTotal,
    errorRate: metrics.requestsTotal ? Number((metrics.errorsTotal / metrics.requestsTotal).toFixed(4)) : 0,
    slowRequestsTotal: metrics.slowRequestsTotal,
    responsesByStatus: metrics.responsesByStatus,
    averageLatencyMs: duration.count ? Number((duration.total / duration.count).toFixed(2)) : 0,
    maxLatencyMs: duration.max,
    latencyBuckets: duration.buckets,
    routes: Object.fromEntries(
      Object.entries(metrics.responsesByRoute).map(([key, value]) => [
        key,
        {
          count: value.count,
          errors: value.errors,
          averageLatencyMs: value.count ? Number((value.totalDurationMs / value.count).toFixed(2)) : 0,
          maxLatencyMs: value.maxDurationMs,
          lastStatusCode: value.lastStatusCode,
        },
      ])
    ),
    db: metrics.db,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memoryRssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
      memoryHeapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
      memoryHeapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(2)),
    },
  };
};

module.exports = {
  recordRequest,
  recordSlowQuery,
  snapshot,
};
