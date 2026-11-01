import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dream Big Academy',
    short_name: 'DB Academy',
    description: 'Student portal for the Dream Big Studios Audio Engineering Academy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e0f33',
    theme_color: '#1e0f33',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
