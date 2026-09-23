import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  async rewrites() {
    return [
      {
        source: "/login",
        destination: "/sign-in",
      },
    ];
  },
};

export default nextConfig;
