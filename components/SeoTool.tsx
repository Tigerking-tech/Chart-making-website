'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { renderChart, SAMPLES, samplesFor, DEFAULT_TITLES, DEFAULT_TITLES_EN } from '@/lib/charts';
import { computeFor, type ToolInputs } from '@/lib/seoCalc';
import { SEO_PAGES, type SeoPage, type Lang } from '@/lib/seoPages';
import { encodeState } from '@/lib/shareState';
import { passthroughQuery } from '@/lib/attribution';
import { downloadSVG, downloadPNG } from '@/lib/engine/export/exporter.js';

// —— 工具区固定文案（SEO 页专用，内联双语，不污染全局字典）——
const UI = {
  zh: {
    dataLabel: '数据（CSV，首行为表头）', jsonLabel: '鱼骨图结构（JSON）',
    loadSample: '载入示例', clear: '清空', copy: '复制数据', copied: '已复制',
    live: '实时计算', theme: '主题',
    usl: '规格上限 USL', lsl: '规格下限 LSL', subgroup: '子组大小（0=自动）', bins: '分箱数（0=自动）',
    optPlaceholder: '可选', autoPlaceholder: '自动',
    result: '计算结果', verdict: '结论', noData: '请粘贴数据后查看结果',
    exportSvg: '导出 SVG', exportPng: '导出 PNG 2×', openStudio: '在 Studio 继续编辑 ↗',
    ruleHit: '命中', ruleMiss: '未命中', rulePoints: '命中点',
    ruleStrip: '点位命中分布（红=被任一规则标记）',
    ruleIntroWE: '以下 4 条 Western Electric 基本准则逐点扫描，口径与左侧控制图完全一致。',
    ruleIntroNelson: '以下 8 条 Nelson 准则逐点扫描，口径与左侧控制图完全一致。',
    chartTitle: '实时矢量预览',
    hintLine: '所有计算都在你的浏览器本地完成，数据不上传。可编辑下方数据，图表与指标会即时更新。',
    toolsTitle: '全部 20 个免费工具',
    compareTitle: 'ChartForge vs Minitab',
    faqTitle: '常见问题',
    relatedTitle: '相关工具',
    ctaTitle: '需要更完整的报告？',
    ctaSub: '把多张图放进带公司品牌、可签字归档的 SPC 报告，一键导出 PDF / PPTX。',
    ctaBtn: '打开品牌画布 →',
  },
  en: {
    dataLabel: 'Data (CSV, header row first)', jsonLabel: 'Fishbone structure (JSON)',
    loadSample: 'Load sample', clear: 'Clear', copy: 'Copy data', copied: 'Copied',
    live: 'Live', theme: 'Theme',
    usl: 'Upper spec USL', lsl: 'Lower spec LSL', subgroup: 'Subgroup size (0 = auto)', bins: 'Bins (0 = auto)',
    optPlaceholder: 'optional', autoPlaceholder: 'auto',
    result: 'Results', verdict: 'Verdict', noData: 'Paste data to see results',
    exportSvg: 'Export SVG', exportPng: 'Export PNG 2×', openStudio: 'Open in Studio ↗',
    ruleHit: 'Triggered', ruleMiss: 'Clear', rulePoints: 'Points',
    ruleStrip: 'Point-level hits (red = flagged by a rule)',
    ruleIntroWE: 'All four Western Electric basic rules are evaluated point by point, using the exact limits of the chart on the left.',
    ruleIntroNelson: 'All eight Nelson rules are evaluated point by point, using the exact limits of the chart on the left.',
    chartTitle: 'Live vector preview',
    hintLine: 'Everything runs locally in your browser — your data never leaves the page. Edit the data below and the chart and metrics update instantly.',
    toolsTitle: 'All 20 free tools',
    compareTitle: 'ChartForge vs Minitab',
    faqTitle: 'FAQ',
    relatedTitle: 'Related tools',
    ctaTitle: 'Need a complete report?',
    ctaSub: 'Drop multiple charts into a brand-styled, sign-off-ready SPC report and export PDF / PPTX.',
    ctaBtn: 'Open Brand Canvas →',
  },
};

const THEME_IDS = ['light', 'academic', 'business', 'dark'] as const;
const THEME_LABELS: Record<string, { zh: string; en: string }> = {
  light: { zh: '浅色', en: 'Light' }, academic: { zh: '学术', en: 'Academic' },
  business: { zh: '商务', en: 'Business' }, dark: { zh: '深色', en: 'Dark' },
};

export function SeoTool({ page, lang }: { page: SeoPage; lang: Lang }) {
  const u = UI[lang];
  const isFish = page.mode === 'fishbone';
  const sampleMap = samplesFor(lang);
  const initialData = page.sampleOverride
    || (isFish ? (SAMPLES.fishbone as string) : (page.chartType ? sampleMap[page.chartType] : ''));
  // 图表内标题用引擎短图名（H1 太长会与图内结论副标题挤在一起）
  const chartTitle = page.chartType
    ? (lang === 'en' ? DEFAULT_TITLES_EN[page.chartType] : DEFAULT_TITLES[page.chartType])
    : page.kw;

  const [data, setData] = useState<string>(initialData || '');
  const [usl, setUsl] = useState<string>('10.10');
  const [lsl, setLsl] = useState<string>('9.90');
  const [subgroup, setSubgroup] = useState<string>('');
  const [bins, setBins] = useState<string>('');
  const [themeId, setThemeId] = useState<string>('light');
  const [copied, setCopied] = useState(false);

  const inputs: ToolInputs = {
    data,
    usl: usl === '' ? null : Number(usl),
    lsl: lsl === '' ? null : Number(lsl),
    subgroup: subgroup === '' ? null : Number(subgroup),
    bins: bins === '' ? null : Number(bins),
  };

  // 实时渲染 SVG（纯引擎，服务端/客户端一致）
  const rendered = useMemo(() => {
    try {
      return renderChart({
        type: (page.chartType || 'control') as any,
        csv: isFish ? '' : data,
        fishboneJson: isFish ? data : undefined,
        title: chartTitle,
        lang,
        themeId,
        usl: inputs.usl,
        lsl: inputs.lsl,
        subgroup: inputs.subgroup ?? 0,
        bins: inputs.bins ?? 0,
        showTitle: true,
        dataLabels: true,
      });
    } catch (e) {
      return { error: 'render-failed' };
    }
  }, [data, themeId, usl, lsl, subgroup, bins, page, lang, isFish]);

  const svg = rendered.svg || '';
  const calc = useMemo(() => computeFor(page, inputs), [data, usl, lsl, subgroup, bins, page]);
  const report = calc.ruleReport;
  const ruleList = report ? (page.mode === 'rules-nelson' ? report.nelson : report.westernElectric) : [];

  function openStudio() {
    // 透传来源参数（只含 utm / sharecode，不含用户数据），让链路可追踪
    const qs = passthroughQuery();
    const enc = encodeState({
      type: page.chartType || 'control',
      csv: isFish ? '' : data,
      fish: isFish ? data : '',
      title: chartTitle,
      themeId,
      usl: usl === '' ? '' : usl,
      lsl: lsl === '' ? '' : lsl,
      bins: bins === '' ? '' : bins,
      showTitle: true, dataLabels: true, cumulative: true, legend: 'none',
    });
    window.open('/studio' + qs + '#s=' + enc, '_blank', 'noopener');
  }

  async function copyData() {
    try { await navigator.clipboard.writeText(data); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  }

  const showField = (k: string) => page.fields.includes(k as any);
  const numField = showField('usl') || showField('lsl') || showField('subgroup') || showField('bins');

  return (
    <div className="tool-shell">
      <div className="tool-grid">
        {/* 左：输入 */}
        <div className="tool-input-col">
          <div className="tool-col-head">
            <span className="tool-step">1</span>
            <span>{isFish ? u.jsonLabel : u.dataLabel}</span>
            <span className="tool-live"><i />{u.live}</span>
          </div>
          <textarea
            className="tool-textarea"
            value={data}
            spellCheck={false}
            onChange={(e) => setData(e.target.value)}
            aria-label={isFish ? u.jsonLabel : u.dataLabel}
          />
          <div className="tool-input-actions">
            <button type="button" className="btn-ghost sm" onClick={() => { setData(initialData || ''); setSubgroup(''); setBins(''); }}>{u.loadSample}</button>
            <button type="button" className="btn-ghost sm" onClick={() => setData('')}>{u.clear}</button>
            <button type="button" className="btn-ghost sm" onClick={copyData}>{copied ? u.copied : u.copy}</button>
          </div>

          {numField && (
            <div className="tool-fields">
              {showField('usl') && <Field label={u.usl} value={usl} onChange={setUsl} ph={u.optPlaceholder} />}
              {showField('lsl') && <Field label={u.lsl} value={lsl} onChange={setLsl} ph={u.optPlaceholder} />}
              {showField('subgroup') && <Field label={u.subgroup} value={subgroup} onChange={setSubgroup} ph={u.autoPlaceholder} />}
              {showField('bins') && <Field label={u.bins} value={bins} onChange={setBins} ph={u.autoPlaceholder} />}
            </div>
          )}

          <div className="tool-theme">
            <span className="tool-theme-label">{u.theme}</span>
            <div className="tool-seg">
              {THEME_IDS.map((id) => (
                <button key={id} type="button" className={themeId === id ? 'on' : ''} onClick={() => setThemeId(id)}>
                  {THEME_LABELS[id][lang]}
                </button>
              ))}
            </div>
          </div>
          <p className="tool-hint">{u.hintLine}</p>
        </div>

        {/* 右：预览 + 结果 */}
        <div className="tool-output-col">
          <div className="tool-col-head">
            <span className="tool-step">2</span>
            <span>{u.chartTitle}</span>
          </div>
          <div className={`tool-preview theme-${themeId}`}>
            {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="tool-no-data">{rendered.error || u.noData}</div>}
          </div>
          <div className="tool-export">
            <button type="button" className="btn-ghost sm" onClick={() => svg && downloadSVG(svg, `${page.slug}.svg`)}>{u.exportSvg}</button>
            <button type="button" className="btn-ghost sm" onClick={() => svg && downloadPNG(svg, `${page.slug}.png`)}>{u.exportPng}</button>
            <button type="button" className="btn btn-primary sm" onClick={openStudio}>{u.openStudio}</button>
          </div>

          {calc.cards.length > 0 && (
            <div className="tool-results" id="results">
              <div className="tool-results-head">{u.result}</div>
              <div className="tool-cards">
                {calc.cards.map((c, i) => (
                  <div key={i} className={`tool-card tone-${c.tone || 'neutral'}`}>
                    <div className="tool-card-label">{c.label[lang]}</div>
                    <div className="tool-card-value">{c.value}</div>
                  </div>
                ))}
              </div>
              {calc.verdict && (
                <div className={`tool-verdict tone-${calc.verdict.tone}`}>
                  <span className="tool-verdict-tag">{u.verdict}</span>
                  <span>{calc.verdict.text[lang]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 判异准则：逐条规则表 + 点位命中条 */}
      {report && (
        <div className="tool-rules">
          <p className="tool-rules-intro">{page.mode === 'rules-nelson' ? u.ruleIntroNelson : u.ruleIntroWE}</p>
          <div className="tool-rule-strip">
            <div className="tool-rule-strip-label">{u.ruleStrip}</div>
            <div className="tool-rule-strip-dots">
              {report.values.map((_, i) => (
                <span key={i} className={report.flagged.includes(i) ? 'hit' : ''} title={`#${i + 1}`} />
              ))}
            </div>
          </div>
          <div className="tool-rule-list">
            {ruleList.map((r) => (
              <div key={r.id} className={`tool-rule ${r.triggered ? 'is-hit' : ''}`}>
                <div className="tool-rule-id">{r.id}</div>
                <div className="tool-rule-body">
                  <div className="tool-rule-name">{r.zh === r.en ? r.zh : r[lang]}{r.triggered && <span className="tool-rule-badge">{u.ruleHit}</span>}</div>
                  <div className="tool-rule-desc">{lang === 'zh' ? r.desc : r.descEn}</div>
                  {r.triggered && <div className="tool-rule-points">{u.rulePoints}: #{r.points.slice(0, 24).join(', #')}{r.points.length > 24 ? ' …' : ''}</div>}
                </div>
                <div className={`tool-rule-state ${r.triggered ? 'hit' : ''}`}>{r.triggered ? '●' : '○'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph: string }) {
  return (
    <label className="tool-field">
      <span>{label}</span>
      <input type="text" inputMode="decimal" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// —— 工具中心网格（供 hub 页 / 首页复用）——
export function ToolsGrid({ lang, limit = 20 }: { lang: Lang; limit?: number }) {
  const u = UI[lang];
  const items = SEO_PAGES.slice(0, limit);
  return (
    <div className="tools-grid">
      {items.map((p) => (
        <Link key={p.slug} href={`/tools/${p.slug}`} className="tools-card">
          <div className="tools-card-top">
            <span className="tools-ic">{p.icon}</span>
            <span className={`tools-tier tier-${p.tier}`}>T{p.tier}</span>
          </div>
          <div className="tools-card-cat">{p.category[lang]}</div>
          <h3>{p.h1[lang].split(/[—(（]/)[0].trim()}</h3>
          <p>{p.lead[lang]}</p>
          <span className="tools-card-arrow">→</span>
        </Link>
      ))}
    </div>
  );
}

// —— Minitab 对比表（compare 页复用）——
export function CompareTable({ lang }: { lang: Lang }) {
  const rows: [string, string, string, string][] = lang === 'zh' ? [
    ['安装 / 注册', '浏览器打开即用，免安装免注册', '需安装客户端、激活授权', 'ChartForge'],
    ['价格', '免费起步，无水印（保留署名）', '商业授权（年费）', 'ChartForge'],
    ['统计口径', 'AIAG / Western Electric 对齐', '完整、行业标准', 'Minitab'],
    ['控制图 / Cpk / Gage R&R', '内置 20 个高频工具', '内置且更全面', '持平'],
    ['DOE / 可靠性 / 多元统计', '不覆盖（明确划清边界）', '完整支持', 'Minitab'],
    ['图表美观度 / 直接进 PPT', '发丝线、克制用色、矢量导出', '默认样式偏工科，需手工美化', 'ChartForge'],
    ['签字归档报告', '品牌画布 + 签核外壳 + PDF/PPTX', '需另行排版', 'ChartForge'],
    ['数据处理位置', '纯本地，不上传', '本地', '持平'],
  ] : [
    ['Install / sign-up', 'Open in browser, no install or sign-up', 'Desktop install + license activation', 'ChartForge'],
    ['Price', 'Free to start, no watermark (attribution only)', 'Commercial license (annual)', 'ChartForge'],
    ['Statistical conventions', 'Aligned with AIAG / Western Electric', 'Complete, industry standard', 'Minitab'],
    ['Control charts / Cpk / Gage R&R', '20 built-in high-frequency tools', 'Built in and more comprehensive', 'Tie'],
    ['DOE / reliability / multivariate', 'Not covered (explicit scope boundary)', 'Fully supported', 'Minitab'],
    ['Chart design / slide-ready', 'Hairlines, restrained color, vector export', 'Engineering defaults, manual beautifying', 'ChartForge'],
    ['Sign-off-ready report', 'Brand canvas + approval shell + PDF/PPTX', 'Requires separate layout work', 'ChartForge'],
    ['Where data is processed', 'Purely local, never uploaded', 'Local', 'Tie'],
  ];
  const head = lang === 'zh' ? ['维度', 'ChartForge', 'Minitab', '优势'] : ['Dimension', 'ChartForge', 'Minitab', 'Edge'];
  return (
    <div className="cmp-table-wrap">
      <table className="cmp-table">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="cmp-dim">{r[0]}</td>
              <td>{r[1]}</td>
              <td>{r[2]}</td>
              <td><span className={`cmp-edge ${r[3] === 'ChartForge' ? 'cf' : r[3] === 'Minitab' ? 'mt' : 'tie'}`}>{r[3]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
