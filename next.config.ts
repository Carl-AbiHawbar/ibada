import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Product photos uploaded in production are served from Supabase Storage.
const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  // sharp is loaded at runtime by src/server/images.ts; make sure deployments ship it.
  outputFileTracingIncludes: {
    '/admin/**': ['./node_modules/sharp/**/*', './node_modules/@img/**/*'],
  },
  experimental: {
    // Room for one 5 MB photo per upload request.
    serverActions: { bodySizeLimit: '6mb' },
  },
  async headers() {
    return [
      {
        source: '/admin/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/admin/' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
