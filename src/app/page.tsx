import Link from 'next/link';
import Image from 'next/image';
import { RootworkLogo } from '@/components/brand/rootwork-logo';
import { RootworkIcon } from '@/components/brand/rootwork-icon';
import { siteConfig } from '@/config/site';
import { studentNavItems } from '@/config/navigation';

const FIVE_R_PHASES = [
  { label: 'Root', src: '/brand/5r-root.png', desc: 'Ground & Connect' },
  { label: 'Regulate', src: '/brand/5r-regulate.png', desc: 'Check In & Breathe' },
  { label: 'Reflect', src: '/brand/5r-reflect.png', desc: 'Think & Reason' },
  { label: 'Restore', src: '/brand/5r-restore.png', desc: 'Learn & Grow' },
  { label: 'Reconnect', src: '/brand/5r-reconnect.png', desc: 'Apply & Share' },
] as const;

const rolePortals = [
  { label: 'Student Dashboard', href: '/explore' },
  { label: 'Educator Dashboard', href: '/educator/students' },
  { label: 'Parent Dashboard', href: '/parent/dashboard' },
  { label: 'Admin Dashboard', href: '/admin/dashboard' },
] as const;

const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-8 py-14">
      {/* Hero Section */}
      <section className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-10 text-center shadow-sm">
        <RootworkLogo className="mb-6 justify-center" />
        <h1 className="mb-4 text-4xl font-bold text-primary-900">{siteConfig.name}</h1>
        <p className="mb-6 text-xl text-secondary-600">{siteConfig.tagline}</p>
        <p className="mx-auto mb-10 max-w-3xl text-lg text-neutral-600">{siteConfig.description}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={authEnabled ? '/sign-up' : '/learn'}
            className="rounded-lg px-6 py-3 text-white transition-colors"
            style={{ backgroundColor: '#0C3B2E' }}
          >
            {authEnabled ? 'Get Started' : 'Start Learning'}
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border-2 px-6 py-3 transition-colors"
            style={{ borderColor: '#0C3B2E', color: '#0C3B2E' }}
          >
            Sign In
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg border border-neutral-300 px-6 py-3 text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Methodology
          </Link>
        </div>
      </section>

      {/* 5R Framework Strip */}
      <section className="mt-10">
        <h2 className="mb-4 text-center text-lg font-semibold text-primary-900">The 5R Learning Framework</h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {FIVE_R_PHASES.map((phase) => (
            <div key={phase.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-primary-100 bg-white px-4 py-3 shadow-sm">
              <Image
                src={phase.src}
                alt={phase.label}
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-sm font-semibold text-primary-900">{phase.label}</span>
              <span className="text-xs text-neutral-500">{phase.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Student Workspace */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-primary-900">Student workspace</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studentNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50"
            >
              <span className="mb-2 inline-flex rounded-lg bg-primary-100 p-2 text-primary-800 transition-colors group-hover:bg-primary-200">
                <RootworkIcon href={item.href} label={item.label} />
              </span>
              <p className="mt-1 font-semibold">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Role-Based Portals */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-primary-900">Role-based portals</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {rolePortals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-primary-400 hover:bg-primary-50"
            >
              <RootworkIcon href={portal.href} label={portal.label} />
              {portal.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

