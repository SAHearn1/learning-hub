import Link from 'next/link';

interface PortalItem {
  label: string;
  href: string;
  icon: string;
}

interface PortalHomeProps {
  title: string;
  description: string;
  items: readonly PortalItem[];
}

export function PortalHome({ title, description, items }: PortalHomeProps) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">{title}</h1>
        <p className="mt-2 text-neutral-700">{description}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{item.icon}</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{item.label}</p>
            <p className="mt-1 text-sm text-neutral-600">Open {item.label.toLowerCase()} workspace</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
