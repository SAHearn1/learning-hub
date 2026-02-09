# Production Monitoring & Alerting

This directory contains monitoring and alerting configurations for the Learning Hub production environment.

## Overview

The monitoring system tracks key metrics and sends alerts when thresholds are exceeded. It is designed to support **100 concurrent students** as required for MVP launch.

## Components

### 1. Metrics Collection (`src/lib/monitoring/metrics.ts`)

Collects and stores metrics for:
- **HTTP Requests:** Response times, error rates, throughput
- **AI Usage:** Token counts, costs, latencies
- **Database:** Query performance, connection health
- **Cache:** Hit/miss rates, operation latencies
- **Users:** Concurrent users, registration rates
- **Compliance:** COPPA consent metrics
- **System:** Memory and CPU usage

### 2. Alert Rules (`src/lib/monitoring/alerts.ts`)

Defines alert conditions and notification channels with comprehensive severity levels and thresholds.

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key

# Metrics API (for external monitoring)
METRICS_API_TOKEN=your-secure-token

# Datadog (optional - already configured)
DD_API_KEY=your-datadog-api-key
DD_SITE=datadoghq.com

# Sentry (optional - already configured)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Install Datadog Dashboard

1. Log in to Datadog
2. Navigate to **Dashboards** → **New Dashboard**
3. Click **Import Dashboard JSON**
4. Upload `monitoring/datadog-dashboard.json`
5. Save and customize as needed

## Usage

### Access Metrics API

```bash
# Get current metrics (JSON format)
curl https://your-domain.com/api/metrics?format=json

# Get Prometheus format
curl https://your-domain.com/api/metrics
```

## Alert Response Procedures

### CRITICAL Alerts

Immediate action required - page on-call engineer

### ERROR Alerts

Issue needs attention within 1 hour

### WARNING Alerts

Monitor and investigate as capacity allows

### INFO Alerts

Informational - no action required

## Support

For questions or issues with monitoring:
- Slack: #engineering-ops
- Docs: https://docs.learninghub.com/monitoring
