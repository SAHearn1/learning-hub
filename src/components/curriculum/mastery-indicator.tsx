'use client';

interface MasteryIndicatorProps {
  masteryLevel: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function MasteryIndicator({ 
  masteryLevel, 
  size = 'md', 
  showLabel = true,
  className 
}: MasteryIndicatorProps) {
  const clamped = Math.min(100, Math.max(0, masteryLevel));
  
  const color =
    clamped >= 80 ? 'bg-primary-500' :
    clamped >= 40 ? 'bg-secondary-500' :
    'bg-error-500';
  
  const label =
    clamped >= 80 ? 'Mastered' :
    clamped >= 40 ? 'Developing' :
    'Beginning';

  const heightClass = 
    size === 'sm' ? 'h-2' :
    size === 'lg' ? 'h-4' :
    'h-3';

  return (
    <div className={className}>
      <div className={`relative w-full overflow-hidden rounded-full bg-neutral-100 ${heightClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex items-center justify-between text-xs text-neutral-600">
          <span>{label}</span>
          <span className="font-medium">{Math.round(clamped)}%</span>
        </div>
      )}
    </div>
  );
}
