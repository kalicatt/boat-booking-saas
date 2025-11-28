import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Remove invalid experimental.turbo property (not part of ExperimentalConfig)
};

export default nextConfig;
