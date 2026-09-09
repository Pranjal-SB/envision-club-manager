import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is a stray package-lock.json in the home directory above this repo;
  // without pinning the root, Turbopack walks up and adopts it as the workspace.
  turbopack: { root: __dirname },
};

export default nextConfig;
