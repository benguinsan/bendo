import { existsSync } from "node:fs";

import "./env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(existsSync("Dockerfile") ? { output: "standalone" as const } : {}),
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  devIndicators: false,
};

export default nextConfig;
