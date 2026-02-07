import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tripful/shared"],
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    // Production: add actual image CDN domains here
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
