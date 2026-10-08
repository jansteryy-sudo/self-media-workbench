import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  // Packaged app resources are signed and must remain read-only at runtime.
  experimental: { isrFlushToDisk: false },
  distDir: process.env.WORKBENCH_DESKTOP_BUILD === "1" ? ".next-desktop" : ".next",
  outputFileTracingExcludes: { "/*": ["./workbench-data/**/*", "./artifacts/**/*", "./desktop-build/**/*", "./dist/**/*", "./.env*", "./tests/**/*"] },
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
};
export default config;
