import "./env";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone for Docker / desktop packaging. Skip on Vercel — Next 16.3 +
  // Vercel's adapter + standalone fails with ENOENT next-server.js.nft.json
  // (vercel/next.js#96646). Vercel ignores standalone anyway.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  devIndicators: false,
  // Electron shell loads http://127.0.0.1:3000; Next treats that as cross-origin vs localhost.
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
