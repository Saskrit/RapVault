import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "bcryptjs"],
  images: {
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
