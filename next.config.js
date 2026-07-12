/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'xlsx', 'jszip']
  }
};

module.exports = nextConfig;
