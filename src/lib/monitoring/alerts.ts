/**
 * Production Monitoring & Alerting Configuration
 * Defines alert thresholds, notification channels, and monitoring rules
 */

import { logger } from '@/lib/logger';

// Alert severity levels
export enum AlertSeverity {
  CRITICAL = 'critical', // Immediate action required
  ERROR = 'error',       // Issue needs attention
  WARNING = 'warning',   // Potential issue
  INFO = 'info',         // Informational
}

// Alert channels
export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  PAGERDUTY = 'pagerduty',
  DATADOG = 'datadog',
  SENTRY = 'sentry',
}

// Alert configuration interface
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    timeWindow?: string; // e.g., '5m', '1h'
  };
  severity: AlertSeverity;
  channels: AlertChannel[];
  enabled: boolean;
  tags?: Record<string, string>;
}

/**
 * MVP Production Alert Rules
 * Target: 100 concurrent students
 */
export const alertRules: AlertRule[] = [
  // === CRITICAL ALERTS ===
  {
    id: 'error-rate-critical',
    name: 'High Error Rate',
    description: 'Error rate exceeds 5% over 5 minutes',
    metric: 'http.request.error_rate',
    condition: {
      operator: '>',
      threshold: 0.05, // 5%
      timeWindow: '5m',
    },
    severity: AlertSeverity.CRITICAL,
    channels: [AlertChannel.PAGERDUTY, AlertChannel.SLACK, AlertChannel.EMAIL],
    enabled: true,
    tags: { team: 'engineering', priority: 'p0' },
  },
  {
    id: 'service-down',
    name: 'Service Unavailable',
    description: 'Health check failing',
    metric: 'health.check.status',
    condition: {
      operator: '!=',
      threshold: 200,
      timeWindow: '1m',
    },
    severity: AlertSeverity.CRITICAL,
    channels: [AlertChannel.PAGERDUTY, AlertChannel.SLACK, AlertChannel.EMAIL],
    enabled: true,
    tags: { team: 'engineering', priority: 'p0' },
  },
  {
    id: 'database-connection-failure',
    name: 'Database Connection Failure',
    description: 'Unable to connect to PostgreSQL',
    metric: 'database.connection.error_rate',
    condition: {
      operator: '>',
      threshold: 0.1, // 10%
      timeWindow: '2m',
    },
    severity: AlertSeverity.CRITICAL,
    channels: [AlertChannel.PAGERDUTY, AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'engineering', component: 'database', priority: 'p0' },
  },

  // === ERROR ALERTS ===
  {
    id: 'response-time-p95-high',
    name: 'High Response Time (p95)',
    description: 'p95 response time exceeds 1 second',
    metric: 'http.request.duration.p95',
    condition: {
      operator: '>',
      threshold: 1000, // 1000ms = 1s
      timeWindow: '10m',
    },
    severity: AlertSeverity.ERROR,
    channels: [AlertChannel.SLACK, AlertChannel.EMAIL],
    enabled: true,
    tags: { team: 'engineering', priority: 'p1' },
  },
  {
    id: 'ai-api-error-rate',
    name: 'AI API Error Rate High',
    description: 'Anthropic/OpenAI API error rate exceeds 3%',
    metric: 'ai.api.error_rate',
    condition: {
      operator: '>',
      threshold: 0.03, // 3%
      timeWindow: '10m',
    },
    severity: AlertSeverity.ERROR,
    channels: [AlertChannel.SLACK, AlertChannel.EMAIL],
    enabled: true,
    tags: { team: 'engineering', component: 'ai', priority: 'p1' },
  },
  {
    id: 'cache-miss-rate-high',
    name: 'High Redis Cache Miss Rate',
    description: 'Cache miss rate exceeds 30%',
    metric: 'redis.cache.miss_rate',
    condition: {
      operator: '>',
      threshold: 0.3, // 30%
      timeWindow: '15m',
    },
    severity: AlertSeverity.ERROR,
    channels: [AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'engineering', component: 'cache', priority: 'p2' },
  },

  // === WARNING ALERTS ===
  {
    id: 'concurrent-users-approaching-limit',
    name: 'Concurrent Users Near Capacity',
    description: 'Concurrent users approaching 100 (90% threshold)',
    metric: 'users.concurrent.count',
    condition: {
      operator: '>=',
      threshold: 90, // 90% of 100
      timeWindow: '5m',
    },
    severity: AlertSeverity.WARNING,
    channels: [AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'engineering', component: 'capacity', priority: 'p2' },
  },
  {
    id: 'response-time-p99-high',
    name: 'High Response Time (p99)',
    description: 'p99 response time exceeds 2 seconds',
    metric: 'http.request.duration.p99',
    condition: {
      operator: '>',
      threshold: 2000, // 2000ms = 2s
      timeWindow: '10m',
    },
    severity: AlertSeverity.WARNING,
    channels: [AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'engineering', priority: 'p2' },
  },
  {
    id: 'memory-usage-high',
    name: 'High Memory Usage',
    description: 'Memory usage exceeds 85%',
    metric: 'system.memory.usage_percent',
    condition: {
      operator: '>',
      threshold: 0.85, // 85%
      timeWindow: '10m',
    },
    severity: AlertSeverity.WARNING,
    channels: [AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'engineering', component: 'infrastructure', priority: 'p2' },
  },
  {
    id: 'ai-cost-spike',
    name: 'AI Cost Spike',
    description: 'AI token costs exceed $50/hour',
    metric: 'ai.usage.cost_per_hour',
    condition: {
      operator: '>',
      threshold: 50, // $50/hour
      timeWindow: '1h',
    },
    severity: AlertSeverity.WARNING,
    channels: [AlertChannel.SLACK, AlertChannel.EMAIL],
    enabled: true,
    tags: { team: 'engineering', component: 'ai', priority: 'p2' },
  },

  // === INFO ALERTS ===
  {
    id: 'new-user-registration-surge',
    name: 'New User Registration Surge',
    description: 'Registration rate 3x above baseline',
    metric: 'users.registrations.rate',
    condition: {
      operator: '>',
      threshold: 30, // 30 registrations per hour (3x normal)
      timeWindow: '1h',
    },
    severity: AlertSeverity.INFO,
    channels: [AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'product', priority: 'p3' },
  },
  {
    id: 'coppa-consent-denial-spike',
    name: 'COPPA Consent Denials Spike',
    description: 'Consent denial rate exceeds 20%',
    metric: 'compliance.consent.denial_rate',
    condition: {
      operator: '>',
      threshold: 0.2, // 20%
      timeWindow: '1h',
    },
    severity: AlertSeverity.INFO,
    channels: [AlertChannel.SLACK],
    enabled: true,
    tags: { team: 'compliance', priority: 'p3' },
  },
];

/**
 * Notification configuration
 */
export const notificationConfig = {
  email: {
    critical: ['engineering-oncall@example.com', 'cto@example.com'],
    error: ['engineering-alerts@example.com'],
    warning: ['engineering-alerts@example.com'],
    info: ['product-team@example.com'],
  },
  slack: {
    critical: '#incidents-critical',
    error: '#engineering-alerts',
    warning: '#engineering-alerts',
    info: '#product-analytics',
  },
  pagerduty: {
    serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
    escalationPolicy: 'engineering-oncall',
  },
};

/**
 * Send alert notification
 */
export async function sendAlert(alert: AlertRule, value: number, context?: Record<string, any>) {
  const message = formatAlertMessage(alert, value, context);

  logger.error('Alert triggered', {
    alertId: alert.id,
    alertName: alert.name,
    severity: alert.severity,
    value,
    threshold: alert.condition.threshold,
    context,
  });

  // Send to configured channels
  for (const channel of alert.channels) {
    try {
      switch (channel) {
        case AlertChannel.SLACK:
          await sendSlackNotification(alert, message);
          break;
        case AlertChannel.EMAIL:
          await sendEmailNotification(alert, message);
          break;
        case AlertChannel.PAGERDUTY:
          await sendPagerDutyNotification(alert, message);
          break;
        case AlertChannel.DATADOG:
          await sendDatadogEvent(alert, value, context);
          break;
        case AlertChannel.SENTRY:
          await sendSentryEvent(alert, value, context);
          break;
      }
    } catch (error) {
      logger.error('Failed to send alert notification', {
        channel,
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Format alert message
 */
function formatAlertMessage(alert: AlertRule, value: number, context?: Record<string, any>): string {
  const emoji = getSeverityEmoji(alert.severity);
  const timestamp = new Date().toISOString();

  let message = `${emoji} **${alert.name}**\n\n`;
  message += `**Severity:** ${alert.severity.toUpperCase()}\n`;
  message += `**Description:** ${alert.description}\n`;
  message += `**Current Value:** ${formatValue(value, alert.metric)}\n`;
  message += `**Threshold:** ${formatValue(alert.condition.threshold, alert.metric)} (${alert.condition.operator})\n`;
  message += `**Time:** ${timestamp}\n`;

  if (context) {
    message += `\n**Additional Context:**\n`;
    for (const [key, val] of Object.entries(context)) {
      message += `  - ${key}: ${val}\n`;
    }
  }

  message += `\n**Runbook:** https://docs.learninghub.com/runbooks/${alert.id}`;

  return message;
}

/**
 * Get emoji for severity level
 * Note: Emojis are used here for internal monitoring/alerting (Slack, PagerDuty)
 * and are not part of the user-facing production UI
 */
/* eslint-disable no-restricted-syntax */
function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return '🚨';
    case AlertSeverity.ERROR:
      return '❌';
    case AlertSeverity.WARNING:
      return '⚠️';
    case AlertSeverity.INFO:
      return 'ℹ️';
  }
}
/* eslint-enable no-restricted-syntax */

/**
 * Format metric value for display
 */
function formatValue(value: number, metric: string): string {
  if (metric.includes('rate') || metric.includes('percent')) {
    return `${(value * 100).toFixed(2)}%`;
  }
  if (metric.includes('duration') || metric.includes('latency')) {
    return `${value}ms`;
  }
  if (metric.includes('cost')) {
    return `$${value.toFixed(2)}`;
  }
  return value.toFixed(2);
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(alert: AlertRule, message: string) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    logger.warn('Slack webhook URL not configured');
    return;
  }

  const channel = notificationConfig.slack[alert.severity];

  const payload = {
    channel,
    username: 'Learning Hub Alerts',
    icon_emoji: getSeverityEmoji(alert.severity),
    text: message,
    attachments: [
      {
        color: getSeverityColor(alert.severity),
        fields: [
          {
            title: 'Alert ID',
            value: alert.id,
            short: true,
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true,
          },
        ],
        footer: 'Learning Hub Monitoring',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Send email notification
 */
async function sendEmailNotification(alert: AlertRule, message: string) {
  // TODO: Implement email sending (use SendGrid, AWS SES, etc.)
  logger.info('Email notification would be sent', {
    alertId: alert.id,
    recipients: notificationConfig.email[alert.severity],
  });
}

/**
 * Send PagerDuty notification
 */
async function sendPagerDutyNotification(alert: AlertRule, message: string) {
  if (!notificationConfig.pagerduty.serviceKey) {
    logger.warn('PagerDuty service key not configured');
    return;
  }

  const payload = {
    routing_key: notificationConfig.pagerduty.serviceKey,
    event_action: 'trigger',
    payload: {
      summary: alert.name,
      severity: alert.severity,
      source: 'learning-hub',
      custom_details: {
        description: alert.description,
        message,
      },
    },
  };

  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Send Datadog event
 */
async function sendDatadogEvent(alert: AlertRule, value: number, context?: Record<string, any>) {
  // Datadog events are handled by dd-trace automatically
  logger.info('Datadog event logged', { alertId: alert.id, value, context });
}

/**
 * Send Sentry event
 */
async function sendSentryEvent(alert: AlertRule, value: number, context?: Record<string, any>) {
  if (typeof window === 'undefined') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureMessage(alert.name, {
      level: alert.severity === AlertSeverity.CRITICAL ? 'fatal' :
             alert.severity === AlertSeverity.ERROR ? 'error' :
             alert.severity === AlertSeverity.WARNING ? 'warning' : 'info',
      tags: alert.tags,
      extra: {
        alertId: alert.id,
        description: alert.description,
        value,
        threshold: alert.condition.threshold,
        ...context,
      },
    });
  }
}

/**
 * Get Slack attachment color for severity
 */
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 'danger';
    case AlertSeverity.ERROR:
      return 'danger';
    case AlertSeverity.WARNING:
      return 'warning';
    case AlertSeverity.INFO:
      return 'good';
  }
}

/**
 * Check if alert condition is met
 */
export function checkAlertCondition(alert: AlertRule, currentValue: number): boolean {
  const { operator, threshold } = alert.condition;

  switch (operator) {
    case '>':
      return currentValue > threshold;
    case '<':
      return currentValue < threshold;
    case '>=':
      return currentValue >= threshold;
    case '<=':
      return currentValue <= threshold;
    case '==':
      return currentValue === threshold;
    case '!=':
      return currentValue !== threshold;
  }
}
