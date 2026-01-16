import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack for faster development
  turbopack: {
    root: process.cwd(),
  },
  
  // API rewrites only in development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5002/api/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;