/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'dd-trace',
    '@datadog/libdatadog',
    '@datadog/openfeature-node-server',
    '@opentelemetry/instrumentation',
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer, nextRuntime }) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.io https://*.clerk.accounts.dev https://js.stripe.com https://challenges.cloudflare.com https://vercel.live; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.clerk.com https://images.unsplash.com; font-src 'self' https://vercel.live; connect-src 'self' https://api.clerk.io https://*.clerk.accounts.dev https://api.stripe.com https://*.pinecone.io https://api.anthropic.com https://api.openai.com https://challenges.cloudflare.com https://vercel.live; frame-src https://js.stripe.com https://accounts.clerk.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com https://vercel.live; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
