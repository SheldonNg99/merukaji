import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'img.youtube.com',
      'i.ytimg.com',
      'i3.ytimg.com',
      'i4.ytimg.com',
      'yt3.ggpht.com',
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  output: 'standalone',
};

export default nextConfig;