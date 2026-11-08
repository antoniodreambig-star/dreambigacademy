import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/online`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/apply`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
