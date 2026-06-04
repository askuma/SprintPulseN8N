/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sprintpulse/shared-types"],
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
