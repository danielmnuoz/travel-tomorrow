import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_PAY_API: process.env.PAY_API ?? "false",
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.MAPS_JS_API_KEY ?? "",
    NEXT_PUBLIC_GOOGLE_MAP_ID: process.env.GOOGLE_MAP_ID ?? "",
  },
};

export default nextConfig;
