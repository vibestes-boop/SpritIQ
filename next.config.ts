import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Capacitor-Kompatibilität
  },
};

export default nextConfig;
