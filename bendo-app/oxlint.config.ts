import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    ".agents/**",
    ".claude/**",
    "lib/supabase/database.types.ts",
  ],
  rules: {
    // CNA + Clerk overlays and shadcn CLI output use `function` components,
    // `type` aliases, and inline `import { type X }`.
    "eslint/sort-keys": "off",
    "eslint/func-style": "off",
    "react/function-component-definition": "off",
    "typescript/consistent-type-definitions": "off",
    "import/consistent-type-specifier-style": "off",
  },
});
