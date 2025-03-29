import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
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
    ],
  },
};

export default nextConfig;
