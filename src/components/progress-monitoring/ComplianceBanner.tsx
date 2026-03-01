'use client';

export type ComplianceViolation = {
  ruleCode: string;
  severity: string;
  legalReference: string;
  message: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-50 border-red-300 text-red-800',
  ERROR: 'bg-amber-50 border-amber-300 text-amber-800',
  WARNING: 'bg-yellow-50 border-yellow-300 text-yellow-800',
};

export function ComplianceBanner({
  violations,
  goalCode,
}: {
  violations: ComplianceViolation[];
  goalCode: string;
}) {
  if (violations.length === 0) return null;

  const highest = violations.find((v) => v.severity === 'CRITICAL')
    ?? violations.find((v) => v.severity === 'ERROR')
    ?? violations[0];

  return (
    <div
      className={`rounded-lg border p-3 mb-3 ${SEVERITY_STYLES[highest.severity] ?? SEVERITY_STYLES.WARNING}`}
      role="alert"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold">
          Compliance Alert — {goalCode}
        </span>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium">
          {violations.length} issue{violations.length > 1 ? 's' : ''}
        </span>
      </div>
      <ul className="text-xs space-y-1">
        {violations.map((v) => (
          <li key={v.ruleCode}>
            <span className="font-mono">{v.ruleCode}</span>{' '}
            <span className="text-neutral-600">({v.legalReference})</span>: {v.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
