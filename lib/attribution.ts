// lib/attribution.ts — 轻量来源归因（纯客户端，零上传）
//
// 设计原则：只读取 URL 查询参数与 document.referrer，绝不接触用户粘贴的数据、
// 图表内容或任何表单输入。所有记录只存在当前浏览器的 localStorage 中。
// 这也是本产品「数据不上传服务器」承诺在归因功能上的体现。
//
// 局限（务必知情）：localStorage 是「本机维度」，只能看到这台浏览器自己的访问历史，
// 不能汇总全站访客。要判断真实 SEO/AI 推荐效果，需另接 Search Console 或服务端埋点。
// 本模块的价值在于：验证 utm 标记是否正确、AI 推荐链接是否带来源参数、以及链路透传是否生效。

export type Channel =
  | 'chatgpt' | 'perplexity' | 'claude' | 'gemini'
  | 'google' | 'bing' | 'baidu' | 'other-search'
  | 'direct' | 'referral' | 'internal';

/** 单个渠道的展示文案（中英）。 */
export const CHANNEL_LABEL: Record<Channel, { zh: string; en: string }> = {
  chatgpt: { zh: 'ChatGPT / OpenAI', en: 'ChatGPT / OpenAI' },
  perplexity: { zh: 'Perplexity', en: 'Perplexity' },
  claude: { zh: 'Claude / Anthropic', en: 'Claude / Anthropic' },
  gemini: { zh: 'Gemini', en: 'Gemini' },
  google: { zh: 'Google 搜索', en: 'Google Search' },
  bing: { zh: 'Bing 搜索', en: 'Bing Search' },
  baidu: { zh: '百度搜索', en: 'Baidu Search' },
  'other-search': { zh: '其他搜索', en: 'Other search' },
  direct: { zh: '直接访问 / 无来源', en: 'Direct / no referrer' },
  referral: { zh: '外部引荐', en: 'External referral' },
  internal: { zh: '站内跳转', en: 'Internal navigation' },
};

/** 渠道展示顺序（面板与导出用）。 */
export const CHANNEL_ORDER: Channel[] = [
  'chatgpt', 'perplexity', 'claude', 'gemini',
  'google', 'bing', 'baidu', 'other-search',
  'referral', 'direct', 'internal',
];

export interface Attribution {
  channel: Channel;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  /** referrer 的域名（已去掉路径，避免记录他人站内路径）。 */
  referrerHost: string;
  /** 当前页面路径（不含查询串，避免把 utm 之外的参数也记下来）。 */
  path: string;
  /** 毫秒时间戳。 */
  ts: number;
  /** 是否「疑似 AI 推荐但缺少标记」——用于提示 App 内点击不带 utm 的情况。 */
  unmarked: boolean;
}

const STORE_KEY = 'cf.attribution.v1';
const MAX_RECORDS = 300;

/** 从一段 host 字符串里判断来源渠道。 */
function classifyHost(h: string): Channel | null {
  const host = (h || '').toLowerCase();
  if (!host) return null;
  if (/(^|\.)(chatgpt\.com|openai\.com|chat\.openai\.com)$/.test(host) || host.includes('chatgpt') || host.includes('openai')) return 'chatgpt';
  if (host.includes('perplexity')) return 'perplexity';
  if (host.includes('claude') || host.includes('anthropic')) return 'claude';
  if (host.includes('gemini') || host.includes('bard.google')) return 'gemini';
  if (host.includes('google.') || host === 'google.com' || host.includes('googleusercontent')) return 'google';
  if (host.includes('bing.com')) return 'bing';
  if (host.includes('baidu.com')) return 'baidu';
  if (host.includes('duckduckgo') || host.includes('yahoo') || host.includes('yandex') || host.includes('sogou') || host.includes('so.com')) return 'other-search';
  return null;
}

/**
 * 核心分类函数（纯函数，便于测试）。
 * 优先级：utm_source / ref 参数 > referrer 域名 > 站内 > 直接访问。
 */
export function classify(params: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ref?: string;
  referrerHost?: string;
  currentHost?: string;
}): { channel: Channel; unmarked: boolean } {
  const src = (params.utmSource || '').toLowerCase();
  const ref = (params.ref || '').toLowerCase();
  const rhost = (params.referrerHost || '').toLowerCase();
  const chost = (params.currentHost || '').toLowerCase();

  // 1) 显式 utm_source / ref 最可信
  const byParam = classifyHost(src) || classifyHost(ref);
  if (byParam) return { channel: byParam, unmarked: false };

  // 有些平台用 utm_source=chatgpt.com 之类带域名，或直接写渠道名
  if (/chatgpt|openai|gpt/.test(src) || /chatgpt|openai|gpt/.test(ref)) return { channel: 'chatgpt', unmarked: false };
  if (/perplexity/.test(src) || /perplexity/.test(ref)) return { channel: 'perplexity', unmarked: false };
  if (/claude|anthropic/.test(src) || /claude|anthropic/.test(ref)) return { channel: 'claude', unmarked: false };
  if (/gemini/.test(src) || /gemini/.test(ref)) return { channel: 'gemini', unmarked: false };
  if (/^google$/.test(src) || /^google$/.test(ref)) return { channel: 'google', unmarked: false };
  if (/^bing$/.test(src) || /^bing$/.test(ref)) return { channel: 'bing', unmarked: false };
  if (/^baidu$/.test(src) || /^baidu$/.test(ref)) return { channel: 'baidu', unmarked: false };

  // 2) referrer 域名
  const byRef = classifyHost(rhost);
  if (byRef) return { channel: byRef, unmarked: false };

  // 3) 站内跳转
  if (rhost && chost && (rhost === chost || rhost.endsWith('.' + chost))) {
    return { channel: 'internal', unmarked: false };
  }

  // 4) 无 referrer：直接访问。
  //    文章提到的坑：ChatGPT App 内点开链接常不带 utm、也没有 referrer，
  //    这类访问只能标为 direct，但打上 unmarked 提示「可能来自 AI 推荐，缺标记」。
  if (!rhost) return { channel: 'direct', unmarked: true };

  return { channel: 'referral', unmarked: false };
}

/** 安全取出 host（去掉端口与路径），失败返回空串。 */
export function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

/** 从当前浏览器环境构造一条归因记录（仅在客户端调用）。 */
export function capture(): Attribution | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const rhost = hostOf(document.referrer);
  const { channel, unmarked } = classify({
    utmSource: q.get('utm_source') || '',
    utmMedium: q.get('utm_medium') || '',
    utmCampaign: q.get('utm_campaign') || '',
    ref: q.get('ref') || q.get('source') || '',
    referrerHost: rhost,
    currentHost: window.location.hostname,
  });
  return {
    channel,
    utmSource: q.get('utm_source') || '',
    utmMedium: q.get('utm_medium') || '',
    utmCampaign: q.get('utm_campaign') || '',
    referrerHost: rhost,
    path: window.location.pathname,
    ts: Date.now(),
    unmarked,
  };
}

/** 读取本机历史记录。 */
export function readRecords(): Attribution[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/** 追加一条记录（同页同渠道短时间内去重，避免刷新刷屏）。 */
export function saveRecord(rec: Attribution): void {
  if (typeof window === 'undefined') return;
  try {
    const arr = readRecords();
    const last = arr[arr.length - 1];
    if (last && last.path === rec.path && last.channel === rec.channel && rec.ts - last.ts < 1500) return;
    arr.push(rec);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(arr.slice(-MAX_RECORDS)));
  } catch { /* 隐私模式 / 存储禁用：静默降级，不影响页面 */ }
}

export function clearRecords(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

/**
 * 生成用于「链路透传」的查询串：把本次访问识别到的来源参数带到下一个页面，
 * 这样从工具页跳到 Studio 时仍能保留来源标记。只透传来源元数据，不含任何用户数据。
 */
export function passthroughQuery(): string {
  if (typeof window === 'undefined') return '';
  const q = new URLSearchParams(window.location.search);
  const out = new URLSearchParams();
  // 保留发布平台需要的 sharecode 参数
  const sharecode = q.get('sharecode');
  if (sharecode) out.set('sharecode', sharecode);
  // 透传已有 utm
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'ref']) {
    const v = q.get(k);
    if (v) out.set(k, v);
  }
  // 原始链接没带 utm 但 referrer 能识别时，补一个规范化的 utm_source
  if (!out.has('utm_source')) {
    const rhost = hostOf(document.referrer);
    const ch = classifyHost(rhost);
    if (ch && ch !== 'internal') out.set('utm_source', ch);
  }
  const s = out.toString();
  return s ? '?' + s : '';
}
