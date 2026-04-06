import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg', 'sharp', 'pdf-lib'],
};

export default nextConfig;
