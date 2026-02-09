# Load Testing for Learning Hub

This directory contains load testing infrastructure using [k6](https://k6.io/) to ensure the Learning Hub can handle **100 concurrent students** as required for MVP launch.

## Overview

The load testing suite simulates realistic student learning journeys including:
- Starting learning sessions
- Taking diagnostic assessments
- Engaging in chat tutoring conversations
- Completing formative assessments
- Checking progress

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

**Windows:**
```powershell
choco install k6
```

Or download from: https://k6.io/docs/get-started/installation/

## Test Scenarios

### 1. Steady State Test (Default)
- **Target:** 100 concurrent students
- **Duration:** 10 minutes
- **Purpose:** Verify sustained performance at target capacity

```bash
npm run test:load
# or
bash tests/load/run-load-tests.sh steady_state
```

### 2. Ramp-Up Test
- **Pattern:** Gradual increase from 0 → 100 users
- **Stages:** 25 → 50 → 75 → 100 users (2 min each)
- **Hold:** 5 minutes at 100 users
- **Purpose:** Identify performance degradation points

```bash
bash tests/load/run-load-tests.sh ramp_up
```

### 3. Spike Test
- **Pattern:** Sudden burst from 10 → 150 users
- **Duration:** 1 minute spike sustained
- **Purpose:** Test resilience to traffic surges (e.g., class bell rings)

```bash
bash tests/load/run-load-tests.sh spike
```

### 4. Soak Test
- **Target:** 80 users (80% of capacity)
- **Duration:** 30 minutes
- **Purpose:** Detect memory leaks and resource exhaustion

```bash
bash tests/load/run-load-tests.sh soak
```

### 5. Run All Scenarios
```bash
bash tests/load/run-load-tests.sh all
```

## Performance Thresholds (MVP Requirements)

| Metric | Threshold | Notes |
|--------|-----------|-------|
| **p95 Response Time** | < 500ms | General requests |
| **p99 Response Time** | < 1000ms | General requests |
| **Chat p95** | < 2000ms | AI chat (higher latency expected) |
| **Assessment p95** | < 1500ms | Assessment generation |
| **Error Rate** | < 1% | Less than 1% failures |
| **Request Rate** | > 50 req/s | Minimum throughput |
| **Concurrent Students** | ≤ 100 | Never exceed capacity |

## Custom Configuration

### Test Against Different Environments

**Local development:**
```bash
bash tests/load/run-load-tests.sh steady_state http://localhost:3000
```

**Staging:**
```bash
bash tests/load/run-load-tests.sh steady_state https://staging.learninghub.com
```

**Production (use with caution):**
```bash
bash tests/load/run-load-tests.sh steady_state https://learninghub.com
```

### With Authentication
```bash
export AUTH_TOKEN="your-test-token"
bash tests/load/run-load-tests.sh steady_state
```

Or pass directly:
```bash
bash tests/load/run-load-tests.sh steady_state http://localhost:3000 "your-token"
```

## Results

Test results are saved in `tests/load/results/`:
- **JSON output:** `load-test-YYYYMMDD_HHMMSS.json` (detailed metrics)
- **Summary:** `summary-YYYYMMDD_HHMMSS.json` (aggregated stats)

### Analyzing Results

**View summary:**
```bash
cat tests/load/results/summary-*.json | jq '.metrics.http_req_duration'
```

**Check error rate:**
```bash
cat tests/load/results/summary-*.json | jq '.metrics.http_req_failed.values.rate'
```

**Find slowest requests:**
```bash
cat tests/load/results/load-test-*.json | jq '[.metrics | to_entries[] | select(.key | startswith("http_req_duration")) | {name: .key, p95: .value.values["p(95)"]}] | sort_by(.p95) | reverse'
```

## CI/CD Integration

Add to your CI pipeline:

**.github/workflows/load-test.yml:**
```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Test
        run: bash tests/load/run-load-tests.sh steady_state ${{ secrets.STAGING_URL }} ${{ secrets.TEST_AUTH_TOKEN }}

      - name: Upload Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: load-test-results
          path: tests/load/results/
```

## Monitoring During Tests

### Real-time Monitoring
While tests run, monitor your application:

1. **Application logs:**
   ```bash
   tail -f logs/application.log
   ```

2. **Database connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **System resources:**
   ```bash
   htop
   # or
   docker stats
   ```

4. **Sentry/Datadog dashboards:** Watch for error spikes

### k6 Cloud (Optional)
For advanced visualizations, sign up at https://k6.io/cloud and run:
```bash
k6 cloud tests/load/student-journey.js
```

## Troubleshooting

### High Error Rates
- Check application logs for exceptions
- Verify database connection pool size
- Review rate limiting configuration
- Check API authentication tokens

### Slow Response Times
- Profile database queries (slow query log)
- Check external API latencies (Anthropic, OpenAI)
- Review Redis cache hit rates
- Monitor CPU/memory usage

### Connection Refused
- Ensure application is running
- Check BASE_URL is correct
- Verify firewall/network access

## Next Steps After Load Testing

1. **Optimize bottlenecks** identified in test results
2. **Tune database** connection pools and query indexes
3. **Configure autoscaling** based on concurrent user thresholds
4. **Set up alerts** for performance degradation
5. **Establish baseline** metrics for regression testing

## Package.json Scripts

Add these to `package.json`:
```json
{
  "scripts": {
    "test:load": "bash tests/load/run-load-tests.sh steady_state",
    "test:load:ramp": "bash tests/load/run-load-tests.sh ramp_up",
    "test:load:spike": "bash tests/load/run-load-tests.sh spike",
    "test:load:soak": "bash tests/load/run-load-tests.sh soak",
    "test:load:all": "bash tests/load/run-load-tests.sh all"
  }
}
```

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Types](https://k6.io/docs/test-types/introduction/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-builder/)
