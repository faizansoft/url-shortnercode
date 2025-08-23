/**
 * Next.js config (ESM). Required for environments that do not support next.config.ts.
 * Mirrors the previous TypeScript config.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
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
