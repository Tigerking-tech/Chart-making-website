// lib/site.ts — 站点级常量：所有 canonical / sitemap / robots / OG 统一从这里取，
// 避免域名散落在多个文件里。正式上线时只需设置 NEXT_PUBLIC_SITE_URL 环境变量。
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://chartforge.example.com').replace(/\/$/, '');
export const SITE_NAME = 'ChartForge';
export const SITE_NAME_FULL = 'ChartForge · 图表工坊';

/** 生成绝对 URL。 */
export function abs(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
