import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: a minimal, self-contained server bundle
  // (.next/standalone) — what the Docker image below is built around,
  // instead of shipping the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
