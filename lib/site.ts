// lib/site.ts — 站点级常量：所有 canonical / sitemap / robots / OG 统一从这里取。
// 域名优先级：显式配置 NEXT_PUBLIC_SITE_URL > 部署平台自动域名 > 明确标注的占位值。
// 未配置时 SITE_URL_IS_PLACEHOLDER 为 true，避免把占位域名的构建误当正式站点发布。
const configured =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  (process.env.CF_PAGES_URL ? `https://${process.env.CF_PAGES_URL}` : '');

// IANA 保留示例域（example.com 子域），仅用于本地开发或未配置的构建，不指向任何真实站点。
const PLACEHOLDER = 'https://chartforge.example.com';

export const SITE_URL = (configured || PLACEHOLDER).replace(/\/$/, '');
export const SITE_URL_IS_PLACEHOLDER = !configured;
export const SITE_NAME = 'ChartForge';
export const SITE_NAME_FULL = 'ChartForge · 图表工坊';

/** 生成绝对 URL。 */
export function abs(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
