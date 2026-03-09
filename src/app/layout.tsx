import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { siteConfig } from '@/config/site';
import { GlobalHeader } from '@/components/navigation/global-header';
import { Footer } from '@/components/navigation/footer';
import { DatadogRum } from '@/components/monitoring/datadog-rum';
import './globals.css';

function AuthProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: '/brand/favicon.png',
    apple: '/brand/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen antialiased">
          <GlobalHeader />
          <main>{children}</main>
          <Footer />
          <Analytics />
          <SpeedInsights />
          <DatadogRum />
        </body>
      </html>
    </AuthProvider>
  );
}
