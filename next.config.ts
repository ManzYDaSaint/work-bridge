import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // @ts-ignore - allowedDevOrigins is required for network access in dev
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.1.148:3000"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "sonner"],
  }
};

export default nextConfig;
