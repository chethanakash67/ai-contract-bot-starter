/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable cache compression in dev to avoid zlib OOM and speed rebuilds
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'filesystem', compression: false };
      // Or switch to in-memory if preferred:
      // config.cache = { type: 'memory' };
    }
    return config;
  },
  // Faster runtime responses and smaller bundles
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  // Reduce client bundle by optimizing package imports (Next 14 experimental)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      '@tiptap/extension-underline',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
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
  // Turn off StrictMode in dev to avoid double-rendering overhead
  reactStrictMode: false,
};

module.exports = nextConfig;

