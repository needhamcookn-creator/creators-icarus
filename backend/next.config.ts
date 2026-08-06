import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
