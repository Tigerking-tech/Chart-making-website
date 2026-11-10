import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// AI 爬虫显式放行：ChatGPT / Claude / Perplexity 等检索增强模型是本站的重要来源，
// 单列一条 allow 规则，避免将来新增 disallow 时误伤；也是给爬虫维护者的明确信号。
// 注：这些 UA 与 `*` 的 allow 叠加不冲突，二者都放行。
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',           // OpenAI
  'ClaudeBot', 'Claude-Web', 'anthropic-ai',           // Anthropic
  'PerplexityBot', 'Perplexity-User',                  // Perplexity
  'Google-Extended', 'Applebot-Extended',              // Google / Apple AI 训练
  'CCBot', 'Bytespider', 'cohere-ai', 'YouBot',        // Common Crawl / 其他 LLM 数据源
  'meta-externalagent', 'Amazonbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/selftest'] },
      { userAgent: AI_BOTS, allow: '/', disallow: ['/selftest'] },
    ],
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  };
}
