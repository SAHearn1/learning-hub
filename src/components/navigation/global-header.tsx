import Link from 'next/link';
import Image from 'next/image';

const NAV_LINKS = [
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/community', label: 'Community' },
] as const;

export function GlobalHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: '#0C3B2E', borderColor: '#1E6B45' }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/rwfw-seal.png"
            alt="RootWork Framework"
            width={32}
            height={32}
            className="rounded-full"
            priority
          />
          <span className="text-sm font-bold text-white">RootWork</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
