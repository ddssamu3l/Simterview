import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslist:{
    ignoreDuringBuilds: true,
  },
  typescript:{
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
