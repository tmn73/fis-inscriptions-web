import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Set dummy environment variables during build if they're missing
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_Y29uY2lzZS1xdWFpbC0zNC5jbGVyay5hY2NvdW50cy5kZXYk',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_XgPL6q1CLK6sbGnT3D4lb2zYAUCygBDuog0EbRyv4x',
  },
};

export default withNextIntl(nextConfig);
