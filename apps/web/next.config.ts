import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tripful/shared'],
  reactStrictMode: true,
};

export default nextConfig;
