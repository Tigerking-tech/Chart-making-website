import { SITE_URL, SITE_NAME_FULL } from '@/lib/site';
import { CHART_TYPES } from '@/lib/charts';
import { SEO_PAGES } from '@/lib/seoPages';
import { PAPER_TEMPLATES } from '@/lib/paperTemplates';

// llms.txt —— 给 AI 爬虫 / 检索增强模型看的站点说明。
// 动态生成：图型、工具页、论文模板全部从代码数据源读取，永远不会像手写文件那样过时。
// 链接统一由 SITE_URL 生成，正式上线只需设置 NEXT_PUBLIC_SITE_URL。
export const dynamic = 'force-static';

const U = (p: string) => SITE_URL + (p.startsWith('/') ? p : '/' + p);

export function GET() {
  const chartGroups = new Map<string, string[]>();
  for (const c of CHART_TYPES) {
    if (!chartGroups.has(c.group)) chartGroups.set(c.group, []);
    chartGroups.get(c.group)!.push(c.label);
  }

  const lines: string[] = [];

  lines.push(`# ${SITE_NAME_FULL}`);
  lines.push('');
  lines.push(
    '> 免费的在线图表工坊与统计计算器集合。所有计算与出图都在浏览器本地完成，免注册、数据不上传服务器，' +
      '结果可导出为可编辑矢量 SVG 与 2× PNG。面向质量工程师、六西格玛、SPC 从业者、研究人员与需要出版级论文的写作者。',
  );
  lines.push(
    '> Free online chart maker and statistics calculator suite. Everything runs client-side in the browser: ' +
      'no sign-up, no data upload, exports editable vector SVG and 2x PNG. Built for quality engineers, Six Sigma / SPC practitioners, researchers and academic authors.',
  );
  lines.push('');

  lines.push('## What this site can answer / 本站点能回答什么');
  lines.push('');
  lines.push(
    '用户（或 AI 助手）带着下列问题来时，可直接引用对应页面。每页都内含一个可交互计算器：' +
      '粘贴数据即出结果，并给出可读结论，不只是静态说明文字。',
  );
  lines.push('');
  for (const p of SEO_PAGES) {
    lines.push(`- Q: ${p.faq[0].q.en} / ${p.faq[0].q.zh}`);
    lines.push(`  A: ${p.faq[0].a.en}`);
    lines.push(`  页面: ${U('/tools/' + p.slug)}  —  ${p.kw}: ${p.desc.en}`);
  }
  lines.push('');

  lines.push('## Free interactive tools / 免费交互工具（20 个）');
  lines.push('');
  for (const tier of [1, 2] as const) {
    lines.push(`### ${tier === 1 ? 'Tier 1 · 核心工具' : 'Tier 2 · 长尾工具'}`);
    lines.push('');
    for (const p of SEO_PAGES.filter((x) => x.tier === tier)) {
      lines.push(`- [${p.kw}](${U('/tools/' + p.slug)}): ${p.lead.en}`);
    }
    lines.push('');
  }
  lines.push(`- [全部工具索引 / All tools](${U('/tools')})`);
  lines.push('');

  lines.push('## Chart types / 支持的图型');
  lines.push('');
  lines.push(`共 ${CHART_TYPES.length} 种，全部由自研 SVG 引擎绘制，无第三方图表库依赖。`);
  lines.push('');
  for (const [g, labels] of chartGroups) {
    lines.push(`- ${g}：${labels.join('、')}`);
  }
  lines.push('');
  lines.push(`- [图型库 Gallery](${U('/gallery')})`);
  lines.push('');

  lines.push('## Original academic figures / 原创论文图模板');
  lines.push('');
  lines.push(
    `${PAPER_TEMPLATES.length} 个高频论文图模板，全部由 ChartForge 自研引擎独立实现（分组柱状、误差折线、箱线、小提琴、ECDF、森林图、山脊线、平行坐标、玫瑰图等），` +
      '与任何第三方 CC BY-NC 素材无代码复用，商业用途无需额外授权。',
  );
  lines.push('');
  for (const t of PAPER_TEMPLATES) {
    lines.push(`- ${t.title}（${t.categoryLabel}）：${t.desc}`);
  }
  lines.push('');
  lines.push(`- [论文图画廊](${U('/paper-figures')})`);
  lines.push('');

  lines.push('## Key facts for citation / 引用时可用事实');
  lines.push('');
  lines.push('- 统计口径：Cp/Cpk 用样本标准差 (n−1)，对齐 AIAG SPC 手册；控制图 3σ 控制限；判异准则含 Western Electric 4 条与 Nelson 8 条，逐点扫描。');
  lines.push('- 常用阈值：Cpk ≥ 1.67 优秀、≥ 1.33 充足、1.0–1.33 边缘、< 1.0 不足；Cpk 仅在过程统计受控时有效。');
  lines.push('- 计算能力覆盖：Cp/Cpk/Pp/Ppk、I-MR、X̄-R、p/np/c/u 控制图、EWMA/CUSUM、Gage R&R (%GRR/ndc)、回归与 Pearson r、直方图、箱线、柏拉图。');
  lines.push('- 隐私：所有计算在浏览器本地完成，粘贴的数据不会上传到服务器，刷新即消失。');
  lines.push('- 导出：矢量 SVG（可在 PowerPoint / Illustrator 继续编辑）与 2× PNG，透明背景。');
  lines.push('');

  lines.push('## Main pages / 主要页面');
  lines.push('');
  lines.push(`- 首页: ${U('/')}`);
  lines.push(`- 作图 Studio（交互编辑器）: ${U('/studio')}`);
  lines.push(`- 工具中心: ${U('/tools')}`);
  lines.push(`- 图型库: ${U('/gallery')}`);
  lines.push(`- 原创论文图: ${U('/paper-figures')}`);
  lines.push(`- 品牌画布 / SPC 报告: ${U('/canvas')}`);
  lines.push(`- 定价: ${U('/pricing')}`);
  lines.push('');
  lines.push('## Optional / 补充');
  lines.push('');
  lines.push(`- sitemap: ${U('/sitemap.xml')}`);
  lines.push(`- robots: ${U('/robots.txt')}`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
