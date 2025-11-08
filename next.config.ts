import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Canvas is a native module that should only be used server-side
  // It's already only imported in API routes, so no special config needed
};

export default nextConfig;
