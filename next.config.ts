import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000');

if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production' && !apiOrigin) {
  throw new Error('API_ORIGIN não configurada. No Vercel, defina API_ORIGIN com a URL pública do backend GAMBLY (Render).');
}

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
