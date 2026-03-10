import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flutr-org-images.nyc3.digitaloceanspaces.com",
      },
    ],
  },
};

export default nextConfig;
