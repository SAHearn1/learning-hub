export const siteConfig = {
  name: 'RootWork',
  tagline: 'Grow Your Thinking',
  description:
    'AI-powered tutoring platform that integrates trauma-informed pedagogy with adaptive learning technology for K-12 students.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  organization: "Community Exceptional Children's Services",
  creator: 'Dr. Shawn A. Hearn',
  links: {
    support: '/contact',
    methodology: '/methodology',
    privacy: '/privacy',
    terms: '/terms',
    dataRetention: '/data-retention',
  },
} as const;
