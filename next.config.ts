import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "mssql", "tedious"],
};

export default nextConfig;
