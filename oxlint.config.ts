import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: core.ignorePatterns,
  rules: {
    // CNA + Clerk overlays use `function` components and unsorted object keys.
    "eslint/sort-keys": "off",
    "react/function-component-definition": "off",
  },
});
