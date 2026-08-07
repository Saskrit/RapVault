import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
