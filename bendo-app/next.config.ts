import { existsSync } from "node:fs";

import "./env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(existsSync("Dockerfile") ? { output: "standalone" as const } : {}),
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  devIndicators: false,
  // Electron shell loads http://127.0.0.1:3000; Next treats that as cross-origin vs localhost.
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
