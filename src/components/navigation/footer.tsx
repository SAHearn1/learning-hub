import Link from 'next/link';
import { RootworkLogo } from '@/components/brand/rootwork-logo';
import { siteConfig } from '@/config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <RootworkLogo className="mb-4" />
            <p className="text-sm text-neutral-600">
              {siteConfig.tagline}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/methodology" className="text-sm text-neutral-600 hover:text-primary-600">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/curriculum" className="text-sm text-neutral-600 hover:text-primary-600">
                  Curriculum
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-sm text-neutral-600 hover:text-primary-600">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-neutral-600 hover:text-primary-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-neutral-600 hover:text-primary-600">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/data-retention" className="text-sm text-neutral-600 hover:text-primary-600">
                  Data Retention
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-neutral-600 hover:text-primary-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-200 pt-8 text-center text-sm text-neutral-600">
          © {currentYear} {siteConfig.organization}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
