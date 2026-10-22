import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel bills a transformation per cache MISS or STALE revalidation, so
    // variant count and TTL drive the bill. Wingspan tier URLs are immutable
    // (keyed by image id), so they can be cached for the 31-day maximum.
    minimumCacheTTL: 2678400,
    // Trimmed from the 8 defaults: nothing here renders above 1920px.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 128, 256, 384],
    remotePatterns: [
      // Institution logos and facility photos.
      {
        protocol: "https",
        hostname: "flutr-org-images.nyc3.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
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
