const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  transpilePackages: ["@loadtoad/db"],
  experimental: {
    instrumentationHook: true,
    outputFileTracingRoot: path.resolve(__dirname, "../../"),
    serverComponentsExternalPackages: ["bullmq", "ioredis", "@loadtoad/queue", "postgres"],
  },
};

module.exports = nextConfig;
