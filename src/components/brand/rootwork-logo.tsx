import Image from 'next/image';
import { cn } from '@/lib/utils';

interface RootworkLogoProps {
  className?: string;
  compact?: boolean;
}

export function RootworkLogo({ className, compact = false }: RootworkLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <Image
        src="/brand/rwfw-seal.png"
        alt="RootWork Framework"
        width={40}
        height={40}
        className="shrink-0 rounded-full"
      />
      {!compact && (
        <div>
          <p className="text-lg font-bold tracking-tight text-primary-900">RootWork</p>
          <p className="text-xs uppercase tracking-[0.22em] text-primary-700">Learning Hub</p>
        </div>
      )}
    </div>
  );
}
