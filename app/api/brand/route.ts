import { NextRequest, NextResponse } from 'next/server';

// 简易品牌色提取：抓取目标主页，抽取 theme-color、内联 color/background、常见字体。
// 对应 diagram-design 的 "brand onboarding"：把官网视觉收敛为语义 token。
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: '缺少 url' }, { status: 400 });
  let target = url;
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(target, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ChartForge-BrandBot/1.0 (+https://chartforge.example.com)' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    const html = await resp.text();

    const hexes: string[] = [];
    const push = (m: RegExp) => { let x; while ((x = m.exec(html)) !== null) hexes.push(x[1]); };
    push(/theme-color"\s*content="(#[0-9a-fA-F]{3,8})/g);
    push(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8})/g);
    push(/color:\s*(#[0-9a-fA-F]{3,8})/g);
    push(/fill="(#[0-9a-fA-F]{3,8})/g);

    // 频率统计；按「出现次数 × 色彩饱和度」加权，避免把灰白背景当成品牌主色
    const freq: Record<string, number> = {};
    hexes.forEach((h) => {
      const c = h.toLowerCase();
      if (/^#([0-9a-f]{6})$/.test(c)) freq[c] = (freq[c] || 0) + 1;
    });
    const chroma = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    const sorted = Object.entries(freq)
      .map(([c, f]) => ({ c, score: f * (1 + chroma(c) / 96) }))
      .sort((a, b) => b.score - a.score)
      .map((e) => e.c);
    const accent = sorted[0] || '#2F6FED';
    const accent2 = sorted[1] || '#F5803E';

    // 字体：取第一个出现的 font-family 栈，过滤掉 CSS 变量/预处理占位
    const fm = html.match(/font-family:\s*([^;"}]+)/i);
    let font = fm ? fm[1].replace(/['"]/g, '').split(',')[0].trim() : 'Inter';
    if (!font || /^var\(|^\$|--/.test(font)) font = 'Inter';

    return NextResponse.json({ accent, accent2, font });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '抓取失败' }, { status: 502 });
  }
}
