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
        hostname: "tally.so",
        port: "",
        search: "",
        protocol: "https",
      },
    ],
  },
  reactStrictMode: false,
};

export default nextConfig;
