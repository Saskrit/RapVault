import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Next 16 Turbopack vs webpack-plugin warning when plugins touch webpack.
  turbopack: {},
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "bcryptjs",
    "nodemailer",
    "cloudinary",
  ],
  images: {
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
