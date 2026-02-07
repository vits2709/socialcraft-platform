import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // forza la root della workspace esattamente a questa cartella progetto
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
