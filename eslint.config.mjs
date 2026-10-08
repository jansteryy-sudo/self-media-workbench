import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["desktop/*.cjs", "scripts/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  globalIgnores([".next/**", ".next-desktop/**", "next-env.d.ts", "workbench-data/**", "desktop-build/**", "dist/**"]),
]);
