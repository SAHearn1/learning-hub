'use client';

export type TrendDataPoint = {
  date: string;
  value: number;
};

export function TrendChart({
  data,
  baseline,
  target,
  unit,
}: {
  data: TrendDataPoint[];
  baseline: number;
  target: number;
  unit: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
        No data points yet
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const allValues = [...values, baseline, target];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const width = 400;
  const height = 180;
  const padding = { top: 20, right: 40, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  function scaleY(v: number): number {
    return padding.top + chartH - ((v - minVal) / range) * chartH;
  }

  const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: scaleY(d.value),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const baselineY = scaleY(baseline);
  const targetY = scaleY(target);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-label="Progress trend chart">
        {/* Baseline line */}
        <line
          x1={padding.left} y1={baselineY}
          x2={width - padding.right} y2={baselineY}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3"
        />
        <text x={width - padding.right + 4} y={baselineY + 3} fontSize="9" fill="#94a3b8">
          BL: {baseline}
        </text>

        {/* Target line */}
        <line
          x1={padding.left} y1={targetY}
          x2={width - padding.right} y2={targetY}
          stroke="#16a34a" strokeWidth="1" strokeDasharray="4 3"
        />
        <text x={width - padding.right + 4} y={targetY + 3} fontSize="9" fill="#16a34a">
          T: {target}
        </text>

        {/* Data line */}
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563eb" />
        ))}

        {/* X-axis labels */}
        {data.length <= 10 &&
          data.map((d, i) => (
            <text
              key={i}
              x={padding.left + i * xStep}
              y={height - 5}
              fontSize="8"
              fill="#6b7280"
              textAnchor="middle"
            >
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}

        {/* Y-axis unit */}
        <text x={5} y={padding.top - 5} fontSize="9" fill="#6b7280">
          {unit}
        </text>
      </svg>
    </div>
  );
}
