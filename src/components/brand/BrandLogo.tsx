'use client';

import { cn } from '@/lib/utils';

interface BrandLogoProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export function BrandLogo({ variant = 'full', className }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 flex-shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0C3B2E" />
            <stop offset="100%" stopColor="#1E6B45" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="20" fill="url(#brand-gradient)" />
        <path
          d="M20 8c-1 4-3 6-3 10 0 4 1.5 7 3 10 1.5-3 3-6 3-10 0-4-2-6-3-10z"
          fill="#C9A23E"
          opacity="0.9"
        />
        <path
          d="M14 18c2-1 4-1 6 0 2 1 4 1 6 0"
          stroke="#C9A23E"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M12 24c3-1 5-1 8 0 3 1 5 1 8 0"
          stroke="#C9A23E"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
      </svg>
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight" style={{ color: '#0C3B2E' }}>
            RootWork
          </span>
          <span className="text-xs leading-tight" style={{ color: '#475569' }}>
            Learning Hub
          </span>
        </div>
      )}
    </div>
  );
}
