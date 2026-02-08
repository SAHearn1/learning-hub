type CounterMap = Map<string, number>;

const counters: CounterMap = new Map();
const latencyByRoute: Map<string, number[]> = new Map();

export function incrementMetric(name: string, value = 1) {
  counters.set(name, (counters.get(name) ?? 0) + value);
}

export function observeLatency(route: string, latencyMs: number) {
  const existing = latencyByRoute.get(route) ?? [];
  existing.push(latencyMs);
  if (existing.length > 200) {
    existing.shift();
  }
  latencyByRoute.set(route, existing);
}

export function getMetricsSnapshot() {
  const routes = Array.from(latencyByRoute.entries()).map(([route, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.floor(sorted.length * 0.95) - 1);
    const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

    return {
      route,
      avgLatencyMs: Number(avg.toFixed(2)),
      p95LatencyMs: sorted[p95Index] ?? 0,
      samples: values.length,
    };
  });

  return {
    counters: Object.fromEntries(counters.entries()),
    routes,
    generatedAt: new Date().toISOString(),
  };
}

export function renderPrometheusMetrics() {
  const snapshot = getMetricsSnapshot();
  const lines: string[] = [];

  Object.entries(snapshot.counters).forEach(([name, value]) => {
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${value}`);
  });

  snapshot.routes.forEach((routeMetric) => {
    const routeLabel = routeMetric.route.replace(/"/g, '\\"');
    lines.push(`api_route_latency_avg_ms{route="${routeLabel}"} ${routeMetric.avgLatencyMs}`);
    lines.push(`api_route_latency_p95_ms{route="${routeLabel}"} ${routeMetric.p95LatencyMs}`);
  });

  return lines.join('\n');
}

export function resetMetrics() {
  counters.clear();
  latencyByRoute.clear();
}
