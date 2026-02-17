'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  variant?: 'full' | 'compact';
  className?: string;
  size?: number;
}

export function BrandLogo({ variant = 'full', className, size = 40 }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src="/brand/rwfw-seal.png"
        alt="RootWork Framework seal"
        width={size}
        height={size}
        className="flex-shrink-0 rounded-full"
        priority
      />
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
