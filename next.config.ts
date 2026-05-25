import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // This is the ONLY option needed in Next.js 16.2.6+
    // It raises the body size limit for middleware, proxy, and route handlers
    // → Fixes the "Failed to parse body as FormData" error for large videos
    proxyClientMaxBodySize: "2gb",
  },
};

export default nextConfig;