'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { renderChart, samplesFor } from '@/lib/charts';
import { ToolsGrid } from './SeoTool';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { Lang } from '@/lib/i18n';

const UI = {
  zh: {
    pill: '免费 · 免注册 · 打开即用',
    h1a: '不用写代码，', h1b: '也能做出统计正确、能直接进 PPT 的图表',
    lead: '面向「想要论文级图、却不想调 matplotlib」的人：贴数据 → 自动算控制限 / Cp/Cpk / 判异 → 出可编辑矢量图。20 个 SPC 与质量工具全部免费在线，数据不上传。',
    cta1: '免费开始作图 →', cta2: '浏览 20 个免费工具', pickLang: '选择语言',
    badges: ['免费 · 免注册', '数据不上传', '矢量 SVG / PNG 导出', '对齐 AIAG / Western Electric'],
    tabs: ['控制图', 'Cpk 能力', '柏拉图', 'X̄-R 图'],
    previewCap: '引擎实时渲染 · 自包含矢量 SVG',
    chips: ['自动算 UCL / LCL', '矢量 SVG · 可编辑', '数据不上传'],
    stats: [['20', '免费在线工具'], ['58', '种图型'], ['0', '安装 / 注册'], ['100%', '浏览器本地计算']],
    valueH2: '为什么客户愿意从现有工具转过来',
    valueSub: '不是因为我们功能更多，而是因为成熟工具一直没解决这三件事。',
    value: [
      ['不会写代码的人', '实验室里想要论文级图、却不想调 matplotlib 的人，贴数据就能出可发表矢量图。', '低门槛'],
      ['团队要统一视觉', '单人工具不解决团队一致性。品牌画布让全团队共用一套配色与签核外壳。', '协作'],
      ['只想快速算一个 Cpk', '为一次计算装 Minitab、买授权不划算。20 个免费单页工具，打开即算、算完即导出。', '省时间'],
    ],
    toolsH2: '20 个免费在线工具，搜到就能用',
    toolsSub: '控制图、Cpk / 过程能力、Gage R&R、QC 七大工具与判异准则，全部在浏览器本地计算。',
    toolsCta: '查看全部 20 个工具 →',
    howH2: '三步出图', howSub: '把重复劳动交给引擎，你只负责判断结论。',
    how: [
      ['1 · 贴数据', '粘贴 CSV / 表格，首行当表头，自动识别类别与数值列。'],
      ['2 · 自动算 + 选图', '引擎按数据形态推荐图型，计算控制限、Cp/Cpk、判异点并给出可读结论。'],
      ['3 · 美化导出', '切主题实时联动，导出矢量 SVG 或高清 PNG，直接进 PPT / 报告 / 论文。'],
    ],
    ctaH2: '现在就画一张', ctaSub: '免费、免注册、无水印（带署名）。', ctaBtn: '打开 Studio →',
  },
  en: {
    pill: 'Free · No sign-up · Ready in a browser',
    h1a: 'Publication-ready, statistically correct charts — ', h1b: 'without writing a line of code',
    lead: 'For people who want publication-grade figures but do not want to fight matplotlib: paste data → auto-compute control limits / Cp/Cpk / rule violations → export editable vector charts. 20 free SPC & quality tools, all client-side.',
    cta1: 'Start charting free →', cta2: 'Explore 20 free tools', pickLang: 'Choose language',
    badges: ['Free · No sign-up', 'Data stays local', 'Vector SVG / PNG export', 'AIAG / Western Electric aligned'],
    tabs: ['Control chart', 'Cpk capability', 'Pareto', 'X̄-R chart'],
    previewCap: 'Rendered live by the engine · self-contained vector SVG',
    chips: ['Auto UCL / LCL', 'Editable vector SVG', 'Data never uploaded'],
    stats: [['20', 'free online tools'], ['58', 'chart types'], ['0', 'install / sign-up'], ['100%', 'computed locally']],
    valueH2: 'Why customers actually switch from the tools they already use',
    valueSub: 'Not because we have more features — but because mature tools never solved these three things.',
    value: [
      ['People who do not code', 'Researchers who want publication-grade figures but refuse to fight matplotlib get editable vector charts by pasting data.', 'Low barrier'],
      ['Teams that need one visual language', 'Individual tools do not solve team consistency. Brand Canvas gives the whole team one palette and a sign-off shell.', 'Collaboration'],
      ['Just need one quick Cpk', 'Installing and licensing Minitab for a single number is bad value. 20 free single-page tools open, compute and export instantly.', 'Time saved'],
    ],
    toolsH2: '20 free online tools, ready when you find them',
    toolsSub: 'Control charts, Cpk / capability, Gage R&R, the seven QC tools and rule checkers — all computed locally in your browser.',
    toolsCta: 'See all 20 tools →',
    howH2: 'Chart in three steps', howSub: 'Let the engine do the grunt work; you own the conclusions.',
    how: [
      ['1 · Paste data', 'Paste CSV / a table. First row is the header; categories and numeric columns are auto-detected.'],
      ['2 · Auto-compute & pick', 'The engine recommends a chart and computes control limits, Cp/Cpk and rule violations into a readable verdict.'],
      ['3 · Beautify & export', 'Switch themes live, then export vector SVG or hi-res PNG straight into slides, reports or papers.'],
    ],
    ctaH2: 'Chart one now', ctaSub: 'Free, no sign-up, no watermark (attribution only).', ctaBtn: 'Open Studio →',
  },
};

const TAB_TYPES = ['control', 'capability', 'pareto', 'xbarR'] as const;

export function HomeClient({ lang }: { lang: Lang }) {
  const u = UI[lang];
  const [tab, setTab] = useState(0);
  const sample = useMemo(() => samplesFor(lang), [lang]);

  // Hero 预览：用项目自研引擎实时渲染真实 SVG（不是截图 / 素材图）
  const preview = useMemo(() => renderChart({
    type: TAB_TYPES[tab] as any,
    csv: sample[TAB_TYPES[tab]],
    title: u.tabs[tab],
    lang,
    themeId: 'light',
    usl: TAB_TYPES[tab] === 'capability' ? 10.10 : null,
    lsl: TAB_TYPES[tab] === 'capability' ? 9.90 : null,
    showTitle: false,
    dataLabels: true,
  }).svg || '', [tab, sample, lang, u.tabs]);

  return (
    <div className="home">
      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <span className="pill">{u.pill}</span>
            <h1>{u.h1a}<span className="grad">{u.h1b}</span></h1>
            <p className="lead">{u.lead}</p>
            <div className="hero-lang">
              <span className="hero-lang-label">{u.pickLang}</span>
              <LanguageSwitcher lang={lang} variant="hero" />
            </div>
            <div className="hero-cta">
              <Link href="/studio" className="btn btn-primary btn-lg">{u.cta1}</Link>
              <Link href="/tools" className="btn btn-ghost btn-lg">{u.cta2}</Link>
            </div>
            <div className="home-badges">
              {u.badges.map((b, i) => <span key={i} className="home-badge">✓ {b}</span>)}
            </div>
          </div>

          <div className="home-preview-wrap reveal">
            <div className="home-preview">
              <div className="home-preview-bar">
                <div className="home-preview-tabs">
                  {u.tabs.map((t, i) => (
                    <button key={i} type="button" className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{t}</button>
                  ))}
                </div>
                <span className="home-preview-dots"><i /><i /><i /></span>
              </div>
              <div className="home-preview-svg" dangerouslySetInnerHTML={{ __html: preview }} />
              <div className="home-preview-foot"><span className="live-dot" />{u.previewCap}</div>
            </div>
            <div className="home-float home-float-a">{u.chips[0]}</div>
            <div className="home-float home-float-b">{u.chips[1]}</div>
            <div className="home-float home-float-c">{u.chips[2]}</div>
          </div>
        </div>
      </section>

      {/* 信任数字条 */}
      <section className="home-stats">
        <div className="container home-stats-grid">
          {u.stats.map(([n, label], i) => (
            <div key={i} className="home-stat"><strong>{n}</strong><span>{label}</span></div>
          ))}
        </div>
      </section>

      {/* 价值主张：承接「客户凭什么转」 */}
      <section className="section" id="features">
        <div className="container">
          <div className="sec-head reveal">
            <h2>{u.valueH2}</h2>
            <p className="sub">{u.valueSub}</p>
          </div>
          <div className="value-grid">
            {u.value.map(([h, p, tag], i) => (
              <div className="value-card reveal" key={i} style={{ animationDelay: `${i * 90}ms` }}>
                <span className="value-tag">{tag}</span>
                <span className="value-n">0{i + 1}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 20 工具引流 */}
      <section className="section alt">
        <div className="container">
          <div className="sec-head reveal">
            <h2>{u.toolsH2}</h2>
            <p className="sub">{u.toolsSub}</p>
          </div>
          <div className="reveal"><ToolsGrid lang={lang} limit={6} /></div>
          <div className="home-tools-cta">
            <Link href="/tools" className="btn btn-primary btn-lg">{u.toolsCta}</Link>
          </div>
        </div>
      </section>

      {/* 三步 */}
      <section className="section">
        <div className="container">
          <div className="sec-head reveal"><h2>{u.howH2}</h2><p className="sub">{u.howSub}</p></div>
          <div className="how-grid">
            {u.how.map(([h, p], i) => (
              <div className="how-card reveal" key={i} style={{ animationDelay: `${i * 90}ms` }}>
                <div className="how-line" aria-hidden="true"><span /></div>
                <h3>{h}</h3><p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-final">
        <div className="container home-final-inner reveal">
          <h2>{u.ctaH2}</h2>
          <p>{u.ctaSub}</p>
          <Link href="/studio" className="btn btn-primary btn-lg">{u.ctaBtn}</Link>
        </div>
      </section>
    </div>
  );
}
