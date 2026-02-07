import Link from 'next/link';
import { RootworkIcon } from '@/components/brand/rootwork-icon';
import { RootworkLogo } from '@/components/brand/rootwork-logo';
import { siteConfig } from '@/config/site';
import { studentNavItems } from '@/config/navigation';

const rolePortals = [
  { label: 'Educator Dashboard', href: '/educator/dashboard' },
  { label: 'Parent Dashboard', href: '/parent/dashboard' },
  { label: 'Admin Dashboard', href: '/admin/dashboard' },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-8 py-14">
      <section className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-10 text-center shadow-sm">
        <RootworkLogo className="mb-6 justify-center" />
        <h1 className="mb-4 text-4xl font-bold text-primary-800">{siteConfig.name}</h1>
        <p className="mb-6 text-xl text-secondary-700">{siteConfig.tagline}</p>
        <p className="mx-auto mb-10 max-w-3xl text-lg text-neutral-600">{siteConfig.description}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary-600 px-6 py-3 text-white transition-colors hover:bg-primary-700"
          >
            Get Started
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg border border-primary-600 px-6 py-3 text-primary-600 transition-colors hover:bg-primary-50"
          >
            Learn More
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-neutral-900">Student workspace</h2>
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

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-neutral-900">Role-based portals</h2>
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
