const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF first: the seller guide screenshots come out well under 100 KB at
    // 2x column width, where WebP does not (#79).
    formats: ["image/avif", "image/webp"],
    // Allow seller avatars from Clerk + Supabase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};
module.exports = withNextIntl(nextConfig);
