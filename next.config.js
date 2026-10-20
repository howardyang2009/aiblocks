const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // App-wide: AVIF first, WebP as fallback. AVIF keeps the seller guide
    // screenshots well under 100 KB at 2x column width, where WebP does not.
    // 1440 sits between Next's default 1200 and 1920, so a 2x screen fetches
    // the ~1368 px the guide column needs instead of 1920 (#79).
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    // Allow seller avatars from Clerk + Supabase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};
module.exports = withNextIntl(nextConfig);
