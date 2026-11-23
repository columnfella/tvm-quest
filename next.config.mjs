/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  // API routes read content/course.json at runtime (for the leaderboard namespace), so ship it with them.
  outputFileTracingIncludes: { '/api/**': ['./content/course.json'] },
  poweredByHeader: false,
  async headers() {
    return [{
      // static emoji images never change between deploys of the same name: cache them for a week
      source: '/assets/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
    }, {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
