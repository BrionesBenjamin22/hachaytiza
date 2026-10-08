import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // pnpm stores runtime packages outside apps/web in the monorepo root.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
