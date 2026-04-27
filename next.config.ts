import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg', 'sharp', 'pdf-lib'],
  experimental: {
    staleTimes: {
      dynamic: 0,   // never serve stale RSC payloads for dynamic routes
      static: 60,   // 1 min for statically prefetched pages
    },
  },
};

export default nextConfig;
