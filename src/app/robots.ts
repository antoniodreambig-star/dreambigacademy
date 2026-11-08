import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/online', '/apply'],
        // Student and instructor areas are private. They also carry a noindex tag as a second safeguard.
        disallow: ['/admin', '/home', '/login', '/api/', '/auth/', '/consent/', '/classes', '/schedule', '/messages', '/profile', '/resources', '/videos', '/live', '/office-hours', '/tuition', '/setup', '/welcome', '/rules', '/feedback'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
