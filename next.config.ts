import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Allows images to be loaded from the following domains - will be updated once the CS team finishes their project and makes a unified bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flutr-org-images.nyc3.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "flutr-butt-images.nyc3.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "flutr-butt-images.nyc3.cdn.digitaloceanspaces.com",
      },
    ],
  },
};

export default nextConfig;
