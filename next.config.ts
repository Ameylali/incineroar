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
  },
  experimental: {
    serverActions: {
      allowedOrigins: [...(process.env.ALLOWED_ORIGINS || '').split(',')],
    },
  },
};

export default nextConfig;
