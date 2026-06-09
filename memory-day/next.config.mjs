/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "bcryptjs",
      "@anthropic-ai/sdk",
      "@react-pdf/renderer",
    ],
  },
};

export default nextConfig;
