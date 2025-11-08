import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase API route body size limit for large PDF exports (up to 1GB)
  experimental: {
    serverActions: {
      bodySizeLimit: '1gb',
    },
  },
};

export default nextConfig;
