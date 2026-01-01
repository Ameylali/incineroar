import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/sprites/**', // Allows all paths on this hostname
      },
    ],
    qualities: [25, 50, 75, 100],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [...(process.env.ALLOWED_ORIGINS || '').split(',')],
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
