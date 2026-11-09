import type { MetadataRoute } from 'next';
import { SITE_URL, abs } from '@/lib/site';
import { SEO_PAGES } from '@/lib/seoPages';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const core = [
    { url: SITE_URL + '/', lastModified: now, changeFrequency: 'weekly' as const, priority: 1 },
    { url: abs('/tools'), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.95 },
    { url: abs('/studio'), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: abs('/report'), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 },
    { url: abs('/canvas'), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 },
    { url: abs('/gallery'), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: abs('/paper-figures'), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
    { url: abs('/figures4papers'), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: abs('/pricing'), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  ];
  const landing = SEO_PAGES.map((p) => ({
    url: abs(`/tools/${p.slug}`),
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: p.tier === 1 ? 0.9 : 0.8,
  }));
  return [...core, ...landing];
}
