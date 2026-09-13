import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis"],
  experimental: {
    optimisticClientCache: false,
    optimizePackageImports: ["@phosphor-icons/react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/icon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
