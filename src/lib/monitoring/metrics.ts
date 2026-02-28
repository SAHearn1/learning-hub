/**
 * Production Metrics Collection
 * Collects and reports metrics for monitoring and alerting.
 *
 * Storage backend:
 *   - Primary: optional Datadog StatsD push (set DATADOG_STATSD_HOST env var).
 *   - Fallback: in-memory sliding window (1 000 samples per metric).
 *     The in-memory store is instance-local and resets on cold start.
 *     Use it only in development or as a local read path; always prefer
 *     the StatsD backend for production alerting.
 */

import { logger } from '@/lib/logger';
import { alertRules, checkAlertCondition, sendAlert } from './alerts';

// ---------------------------------------------------------------------------
// Optional Datadog StatsD push
// ---------------------------------------------------------------------------

/**
 * Push a gauge or counter to Datadog via UDP StatsD.
 * Only active when DATADOG_STATSD_HOST is set.
 * Fire-and-forget: errors are swallowed so metric failures never affect
 * request latency or availability.
 */
function pushToStatsd(metric: string, value: number, type: 'g' | 'c' = 'g'): void {
  const host = process.env.DATADOG_STATSD_HOST;
  if (!host) return;

  const port = parseInt(process.env.DATADOG_STATSD_PORT ?? '8125', 10);
  const prefix = process.env.DATADOG_METRIC_PREFIX ?? 'rootwork';
  const env = process.env.NODE_ENV ?? 'development';

  const payload = `${prefix}.${metric}:${value}|${type}|#env:${env}`;

  import('node:dgram').then((dgram) => {
    const client = dgram.createSocket('udp4');
    const buf = Buffer.from(payload);
    client.send(buf, 0, buf.length, port, host, () => client.close());
  }).catch(() => {/* swallow — never affect request path */});
}

// ---------------------------------------------------------------------------
// In-memory metrics store (instance-local fallback / dev mode)
// ---------------------------------------------------------------------------

interface MetricSample {
  value: number;
  timestamp: number;
}

class MetricsStore {
  private metrics: Map<string, MetricSample[]> = new Map();
  private readonly MAX_SAMPLES = 1000;

  record(metric: string, value: number, timestamp: number = Date.now()) {
    // Push to external aggregator (no-op when DATADOG_STATSD_HOST not set)
    pushToStatsd(metric, value);

    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const samples = this.metrics.get(metric)!;
    samples.push({ value, timestamp });

    // Keep only recent samples
    if (samples.length > this.MAX_SAMPLES) {
      samples.shift();
    }
  }

  get(metric: string, timeWindow?: string): number[] {
    const samples = this.metrics.get(metric) || [];

    if (!timeWindow) {
      return samples.map((s) => s.value);
    }

    // Filter to only samples within the specified time window
    const windowMs = parseTimeWindow(timeWindow);
    const cutoff = Date.now() - windowMs;
    return samples.filter((s) => s.timestamp >= cutoff).map((s) => s.value);
  }

  getLatest(metric: string): number | undefined {
    const samples = this.metrics.get(metric);
    return samples && samples.length > 0 ? samples[samples.length - 1]!.value : undefined;
  }

  getAverage(metric: string, timeWindow?: string): number {
    const values = this.get(metric, timeWindow);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getPercentile(metric: string, percentile: number, timeWindow?: string): number {
    const values = this.get(metric, timeWindow).sort((a, b) => a - b);
    if (values.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)]!;
  }

  getRate(metric: string, timeWindow: string): number {
    const values = this.get(metric, timeWindow);
    const windowMs = parseTimeWindow(timeWindow);
    const windowSeconds = windowMs / 1000;
    if (windowSeconds === 0) return 0;

    return values.length / windowSeconds;
  }

  clear() {
    this.metrics.clear();
  }
}

// Global metrics store
export const metricsStore = new MetricsStore();

/**
 * Parse time window string to milliseconds
 */
function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

/**
 * Track HTTP request metrics
 */
export function trackHttpRequest(
  path: string,
  method: string,
  statusCode: number,
  duration: number
) {
  metricsStore.record('http.request.count', 1);
  metricsStore.record('http.request.duration', duration);
  metricsStore.record(`http.request.duration.${path}`, duration);

  // Track errors
  if (statusCode >= 400) {
    metricsStore.record('http.request.error', 1);
  } else {
    metricsStore.record('http.request.success', 1);
  }

  // Track specific status codes
  metricsStore.record(`http.request.status.${statusCode}`, 1);

  // Calculate error rate
  const totalRequests = metricsStore.get('http.request.count', '5m').length;
  const errorRequests = metricsStore.get('http.request.error', '5m').length;
  const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
  metricsStore.record('http.request.error_rate', errorRate);

  logger.debug('HTTP request tracked', {
    path,
    method,
    statusCode,
    duration,
    errorRate,
  });
}

/**
 * Track AI API usage
 */
export function trackAIUsage(
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  latency: number,
  success: boolean
) {
  metricsStore.record('ai.request.count', 1);
  metricsStore.record(`ai.request.${provider}.count`, 1);
  metricsStore.record('ai.tokens.input', inputTokens);
  metricsStore.record('ai.tokens.output', outputTokens);
  metricsStore.record('ai.tokens.total', inputTokens + outputTokens);
  metricsStore.record('ai.cost', cost);
  metricsStore.record('ai.latency', latency);

  if (!success) {
    metricsStore.record('ai.request.error', 1);
  }

  // Calculate error rate
  const totalAIRequests = metricsStore.get('ai.request.count', '10m').length;
  const errorAIRequests = metricsStore.get('ai.request.error', '10m').length;
  const aiErrorRate = totalAIRequests > 0 ? errorAIRequests / totalAIRequests : 0;
  metricsStore.record('ai.api.error_rate', aiErrorRate);

  // Calculate cost per hour
  const recentCosts = metricsStore.get('ai.cost', '1h');
  const costPerHour = recentCosts.reduce((sum, c) => sum + c, 0);
  metricsStore.record('ai.usage.cost_per_hour', costPerHour);

  logger.debug('AI usage tracked', {
    provider,
    model,
    inputTokens,
    outputTokens,
    cost,
    latency,
    success,
    aiErrorRate,
    costPerHour,
  });
}

/**
 * Track database metrics
 */
export function trackDatabaseQuery(
  operation: 'select' | 'insert' | 'update' | 'delete',
  table: string,
  duration: number,
  success: boolean
) {
  metricsStore.record('database.query.count', 1);
  metricsStore.record(`database.query.${operation}.count`, 1);
  metricsStore.record('database.query.duration', duration);
  metricsStore.record(`database.query.${table}.duration`, duration);

  if (!success) {
    metricsStore.record('database.query.error', 1);
  }

  // Calculate error rate
  const totalQueries = metricsStore.get('database.query.count', '2m').length;
  const errorQueries = metricsStore.get('database.query.error', '2m').length;
  const dbErrorRate = totalQueries > 0 ? errorQueries / totalQueries : 0;
  metricsStore.record('database.connection.error_rate', dbErrorRate);

  logger.debug('Database query tracked', {
    operation,
    table,
    duration,
    success,
    dbErrorRate,
  });
}

/**
 * Track cache operations
 */
export function trackCacheOperation(
  operation: 'get' | 'set' | 'delete',
  hit: boolean,
  duration: number
) {
  metricsStore.record('redis.operation.count', 1);
  metricsStore.record(`redis.operation.${operation}.count`, 1);
  metricsStore.record('redis.operation.duration', duration);

  if (operation === 'get') {
    if (hit) {
      metricsStore.record('redis.cache.hit', 1);
    } else {
      metricsStore.record('redis.cache.miss', 1);
    }

    // Calculate miss rate
    const hits = metricsStore.get('redis.cache.hit', '15m').length;
    const misses = metricsStore.get('redis.cache.miss', '15m').length;
    const total = hits + misses;
    const missRate = total > 0 ? misses / total : 0;
    metricsStore.record('redis.cache.miss_rate', missRate);
  }

  logger.debug('Cache operation tracked', {
    operation,
    hit,
    duration,
  });
}

/**
 * Track concurrent users
 */
export function trackConcurrentUsers(count: number) {
  metricsStore.record('users.concurrent.count', count);

  logger.debug('Concurrent users tracked', { count });
}

/**
 * Track user registration
 */
export function trackUserRegistration(userRole: string) {
  metricsStore.record('users.registrations.count', 1);
  metricsStore.record(`users.registrations.${userRole}.count`, 1);

  // Calculate registration rate per hour
  const registrations = metricsStore.get('users.registrations.count', '1h').length;
  metricsStore.record('users.registrations.rate', registrations);

  logger.debug('User registration tracked', { userRole, registrations });
}

/**
 * Track COPPA consent
 */
export function trackConsentDecision(decision: 'granted' | 'denied' | 'withdrawn') {
  metricsStore.record('compliance.consent.count', 1);
  metricsStore.record(`compliance.consent.${decision}.count`, 1);

  // Calculate denial rate
  const granted = metricsStore.get('compliance.consent.granted.count', '1h').length;
  const denied = metricsStore.get('compliance.consent.denied.count', '1h').length;
  const total = granted + denied;
  const denialRate = total > 0 ? denied / total : 0;
  metricsStore.record('compliance.consent.denial_rate', denialRate);

  logger.debug('Consent decision tracked', { decision, denialRate });
}

/**
 * Track system health
 */
export function trackSystemHealth(
  memoryUsagePercent: number,
  cpuUsagePercent: number
) {
  metricsStore.record('system.memory.usage_percent', memoryUsagePercent);
  metricsStore.record('system.cpu.usage_percent', cpuUsagePercent);

  logger.debug('System health tracked', {
    memoryUsagePercent,
    cpuUsagePercent,
  });
}

/**
 * Check all alert rules and trigger alerts if conditions are met
 */
export async function checkAlerts() {
  for (const alert of alertRules) {
    if (!alert.enabled) continue;

    const currentValue = await getCurrentMetricValue(alert.metric, alert.condition.timeWindow);

    if (currentValue !== undefined && checkAlertCondition(alert, currentValue)) {
      await sendAlert(alert, currentValue, {
        metric: alert.metric,
        timeWindow: alert.condition.timeWindow,
      });
    }
  }
}

/**
 * Get current value for a metric
 */
async function getCurrentMetricValue(metric: string, timeWindow?: string): Promise<number | undefined> {
  // For rate/percentage metrics, return latest value
  if (metric.includes('rate') || metric.includes('percent')) {
    return metricsStore.getLatest(metric);
  }

  // For duration metrics, return p95 or p99
  if (metric.includes('p95')) {
    const baseMetric = metric.replace('.p95', '');
    return metricsStore.getPercentile(baseMetric, 95, timeWindow);
  }
  if (metric.includes('p99')) {
    const baseMetric = metric.replace('.p99', '');
    return metricsStore.getPercentile(baseMetric, 99, timeWindow);
  }

  // For count metrics, return average
  if (metric.includes('count')) {
    return metricsStore.getAverage(metric, timeWindow);
  }

  // Default: return latest value
  return metricsStore.getLatest(metric);
}

/**
 * Start periodic alert checking
 */
export function startAlertMonitoring(intervalMs: number = 60000) {
  setInterval(async () => {
    try {
      await checkAlerts();
    } catch (error) {
      logger.error('Error checking alerts', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, intervalMs);

  logger.info('Alert monitoring started', { intervalMs });
}

/**
 * Export metrics for external monitoring systems
 */
export function exportMetrics() {
  const metrics: Record<string, any> = {};

  // HTTP metrics
  metrics.httpRequestCount = metricsStore.get('http.request.count').length;
  metrics.httpErrorRate = metricsStore.getLatest('http.request.error_rate') || 0;
  metrics.httpP95Duration = metricsStore.getPercentile('http.request.duration', 95);
  metrics.httpP99Duration = metricsStore.getPercentile('http.request.duration', 99);

  // AI metrics
  metrics.aiRequestCount = metricsStore.get('ai.request.count').length;
  metrics.aiErrorRate = metricsStore.getLatest('ai.api.error_rate') || 0;
  metrics.aiCostPerHour = metricsStore.getLatest('ai.usage.cost_per_hour') || 0;

  // Database metrics
  metrics.databaseQueryCount = metricsStore.get('database.query.count').length;
  metrics.databaseErrorRate = metricsStore.getLatest('database.connection.error_rate') || 0;

  // Cache metrics
  metrics.cacheMissRate = metricsStore.getLatest('redis.cache.miss_rate') || 0;

  // User metrics
  metrics.concurrentUsers = metricsStore.getLatest('users.concurrent.count') || 0;
  metrics.registrationsPerHour = metricsStore.getLatest('users.registrations.rate') || 0;

  // Compliance metrics
  metrics.consentDenialRate = metricsStore.getLatest('compliance.consent.denial_rate') || 0;

  // System metrics
  metrics.memoryUsage = metricsStore.getLatest('system.memory.usage_percent') || 0;
  metrics.cpuUsage = metricsStore.getLatest('system.cpu.usage_percent') || 0;

  return metrics;
}
