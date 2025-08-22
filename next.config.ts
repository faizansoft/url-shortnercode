import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local SVG previews in next/image
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
