import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://chartforge.example.com/sitemap.xml',
    host: 'https://chartforge.example.com',
  };
}
