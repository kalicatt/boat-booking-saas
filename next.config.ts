import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Workaround 400 Bad Request on Next image optimizer in prod
    // We serve from /public so disabling optimizer is fine
    unoptimized: true,
  },
};

export default nextConfig;
