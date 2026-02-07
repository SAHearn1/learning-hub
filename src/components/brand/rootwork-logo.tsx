import { cn } from '@/lib/utils';

interface RootworkLogoProps {
  className?: string;
  compact?: boolean;
}

export function RootworkLogo({ className, compact = false }: RootworkLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-10 w-10 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="rootworkLeaf" x1="9" y1="6" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#16A34A" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill="#ECFDF3" />
        <path d="M24 35V17" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 30C19 30 15 26 15 21C20 21 24 25 24 30Z" fill="url(#rootworkLeaf)" />
        <path d="M24 26C29 26 33 22 33 17C28 17 24 21 24 26Z" fill="#22C55E" />
        <circle cx="24" cy="36" r="2" fill="#D97706" />
      </svg>
      {!compact && (
        <div>
          <p className="text-lg font-bold tracking-tight text-primary-900">RootWork</p>
          <p className="text-xs uppercase tracking-[0.22em] text-primary-700">Framework</p>
        </div>
      )}
    </div>
  );
}
