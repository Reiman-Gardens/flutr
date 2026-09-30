import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Institution logos and facility photos.
      {
        protocol: "https",
        hostname: "flutr-org-images.nyc3.digitaloceanspaces.com",
      },
      // Butterfly imagery, via the Wingspan microservice.
      {
        protocol: "https",
        hostname: "sfo3.digitaloceanspaces.com",
        pathname: "/wingspan/**",
      },
    ],
  },
};

export default nextConfig;
