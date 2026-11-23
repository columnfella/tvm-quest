/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  // API routes read content/course.json at runtime (for the leaderboard namespace), so ship it with them.
  outputFileTracingIncludes: { '/api/**': ['./content/course.json'] },
};
export default nextConfig;
