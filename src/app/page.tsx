import { siteConfig } from '@/config/site';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-primary-800 mb-4">
          {siteConfig.name}
        </h1>
        <p className="text-xl text-secondary-600 mb-8">
          {siteConfig.tagline}
        </p>
        <p className="text-lg text-neutral-600 mb-12">
          {siteConfig.description}
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/sign-up"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Get Started
          </a>
          <a
            href="/methodology"
            className="px-6 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>
    </main>
  );
}
