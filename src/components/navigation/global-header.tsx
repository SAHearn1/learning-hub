import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import {
  adminNavItems,
  educatorNavItems,
  getStudentNavItems,
  parentNavItems,
  type NavItem,
} from '@/config/navigation';
import { RootworkIcon } from '@/components/brand/rootwork-icon';
import { HeaderUserMenu } from '@/components/navigation/header-user-menu';

const PUBLIC_NAV_LINKS = [
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/community', label: 'Community' },
] as const;

function splitNav(items: readonly NavItem[]) {
  return {
    primary: items.slice(0, 5),
    overflow: items.slice(5),
  };
}

export async function GlobalHeader() {
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const user = authEnabled ? await getCurrentUser() : null;

  const signedIn = Boolean(user);

  let navItems: readonly NavItem[] = [];
  if (signedIn && user) {
    if (user.role === 'STUDENT') {
      navItems = getStudentNavItems(user.student?.gradeLevel);
    } else if (user.role === 'PARENT') {
      navItems = parentNavItems;
    } else if (user.role === 'PLATFORM_ADMIN' || user.role === 'DISTRICT_ADMIN') {
      navItems = adminNavItems;
    } else {
      navItems = educatorNavItems;
    }
  }

  const { primary, overflow } = splitNav(navItems);

  return (
    <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#0C3B2E', borderColor: '#1E6B45' }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href={signedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
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

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-4 md:flex" aria-label="Main navigation">
          {!signedIn &&
            PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}

          {signedIn &&
            primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center text-white/85">
                  <RootworkIcon href={item.href} label={item.label} />
                </span>
                {item.label}
              </Link>
            ))}

          {signedIn && overflow.length > 0 && (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full px-2.5 py-1 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
                More
              </summary>
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                {overflow.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center text-neutral-700">
                      <RootworkIcon href={item.href} label={item.label} />
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!authEnabled && (
            <Link href="/learn" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
              Start Learning
            </Link>
          )}

          {authEnabled && !signedIn && (
            <>
              <Link href="/sign-in" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#0C3B2E] hover:bg-white/90"
              >
                Sign Up
              </Link>
            </>
          )}

          {authEnabled && signedIn && (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden rounded-full px-2.5 py-1 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Dashboard
              </Link>
              <HeaderUserMenu />
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav (signed in) */}
      {signedIn && navItems.length > 0 && (
        <div className="border-t border-white/10 md:hidden">
          <details>
            <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-white/85">
              Menu
            </summary>
            <div className="flex flex-col px-2 pb-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center text-white/85">
                    <RootworkIcon href={item.href} label={item.label} />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      )}
    </header>
  );
}

