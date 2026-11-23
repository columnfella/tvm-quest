/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Relative asset paths so the static export works from any folder or host path.
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
