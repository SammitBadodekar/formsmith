import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
        port: "",
        search: "",
      },
      {
        hostname: "lh3.googleusercontent.com",
        port: "",
        search: "",
      },
      {
        hostname: "cdn.formsmith.in",
        port: "",
        search: "",
        protocol: "https",
      },
    ],
  },
  reactStrictMode: false,
};

export default nextConfig;
