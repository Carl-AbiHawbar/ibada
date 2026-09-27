// Web app manifest for the installable admin (scoped to /admin/ so the storefront stays a website).
export function GET() {
  return Response.json(
    {
      name: 'IBADA Admin',
      short_name: 'IBADA',
      description: 'Orders, products and notifications for the IBADA shop.',
      id: '/admin',
      start_url: '/admin',
      scope: '/admin/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#FFFFFF',
      theme_color: '#012755',
      icons: [
        { src: '/admin/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/admin/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/admin/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } },
  );
}
