import { siteConfig } from '@/config/site';

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Contact</h1>
      <p className="mt-4 text-neutral-700">For support and partnership inquiries, contact {siteConfig.organization}.</p>
    </main>
  );
}
