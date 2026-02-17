import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IMPORTANT:
  // Do NOT use `output: "export"` for SaaS apps with auth.
  // Export mode forces prerendering /login at build time.
};

export default nextConfig;
