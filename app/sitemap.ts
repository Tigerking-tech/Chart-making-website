import type { MetadataRoute } from 'next';

const BASE = 'https://chartforge.example.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE + '/', lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: BASE + '/studio', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: BASE + '/gallery', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: BASE + '/pricing', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
