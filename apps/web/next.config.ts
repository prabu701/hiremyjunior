import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (docker/web/Dockerfile).
  output: 'standalone',
  // Monorepo: trace workspace packages from the repo root.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@hmj/shared', '@hmj/booking'],
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/storage/v1/object/public/**' }],
  },
  poweredByHeader: false,
};

export default nextConfig;
