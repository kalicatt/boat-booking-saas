import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Workaround 400 Bad Request on Next image optimizer in prod
    // We serve from /public so disabling optimizer is fine
    unoptimized: true,
  },
  experimental: {
    // Disable Turbopack in dev to avoid invalid source map parsing issues
    // Webpack dev provides stable source map handling
    turbo: {
      rules: {},
    },
  },
};

export default nextConfig;
