import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore - allowedDevOrigins is required for network access in dev
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.1.148:3000"],
  experimental: {
  }
};

export default nextConfig;
