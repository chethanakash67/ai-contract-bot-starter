import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/** @type {import('next').NextConfig} */
const config = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // Keep dev stable on Windows; avoid flaky experimental flags
    reactStrictMode: false,
    compress: true,
    poweredByHeader: false,
    swcMinify: true,
    experimental: {},
    webpack: (cfg, { dev }) => {
      if (dev) {
        // Avoid cache compression stalls in dev
        cfg.cache = { type: 'filesystem', compression: false };
      }
      return cfg;
    },
    images: { formats: ['image/avif', 'image/webp'] },
    optimizeFonts: true,
    productionBrowserSourceMaps: false,
    output: 'standalone',
    async headers() {
      return [
        {
          source: '/_next/static/:path*',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
        {
          source: '/fonts/:path*',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ];
    },
  };
};

export default config;
