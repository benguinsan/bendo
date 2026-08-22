import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Keep `ultracite check` green on a fresh CNA scaffold (README / lockfile noise).
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/*.md",
    "package.json",
    "package-lock.json",
  ],
});
