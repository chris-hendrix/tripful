import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@tripful/shared"],
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
