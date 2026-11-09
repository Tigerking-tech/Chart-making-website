'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TIER1, TIER2, type Lang } from '@/lib/seoPages';

const UI = {
  zh: {
    kicker: 'SPC · 质量工具套件',
    h1: '20 个免费在线统计工具，打开就能用',
    lead: '不用装 Minitab、不用写代码、不用注册。控制图、Cpk/过程能力、Gage R&R、QC 七大工具与判异准则全部在浏览器本地计算，导出可编辑矢量图。',
    search: '搜索工具…', all: '全部', t1: 'Tier 1 · 意图最纯', t2: 'Tier 2 · 长尾组合',
    t1sub: '搜索意图最明确、转化最强的 10 个高频工具', t2sub: '补齐属性控制图、判异准则与对比页等长尾场景',
    count: '个工具', empty: '没有匹配的工具，试试别的关键词',
    ctaTitle: '算完之后呢？', ctaSub: '把结果图表放进带公司品牌、可签字归档的 SPC 报告，一键导出 PDF / PPTX。',
    ctaBtn: '打开品牌画布 →',
  },
  en: {
    kicker: 'SPC · Quality Tool Suite',
    h1: '20 free online statistics tools, ready when you open the page',
    lead: 'No Minitab install, no coding, no sign-up. Control charts, Cpk / capability, Gage R&R, the seven QC tools and rule checkers — all computed locally, with editable vector export.',
    search: 'Search tools…', all: 'All', t1: 'Tier 1 · Highest intent', t2: 'Tier 2 · Long tail',
    t1sub: 'The 10 highest-intent, highest-converting tools', t2sub: 'Attribute charts, rule checkers and comparison pages',
    count: 'tools', empty: 'No matching tools — try another keyword',
    ctaTitle: 'What comes after the calculation?', ctaSub: 'Drop the charts into a brand-styled, sign-off-ready SPC report and export PDF / PPTX.',
    ctaBtn: 'Open Brand Canvas →',
  },
};

export function ToolsHubClient({ lang }: { lang: Lang }) {
  const u = UI[lang];
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'all' | 1 | 2>('all');

  const match = (p: typeof TIER1[number]) => {
    const hay = `${p.kw} ${p.h1.zh} ${p.h1.en} ${p.category.zh} ${p.category.en} ${p.desc.en}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  };
  const f1 = useMemo(() => TIER1.filter(match), [q]);
  const f2 = useMemo(() => TIER2.filter(match), [q]);
  const shown1 = tier === 2 ? [] : f1;
  const shown2 = tier === 1 ? [] : f2;
  const total = shown1.length + shown2.length;

  const Card = ({ p }: { p: typeof TIER1[number] }) => (
    <Link href={`/tools/${p.slug}`} className="tools-card">
      <div className="tools-card-top">
        <span className="tools-ic">{p.icon}</span>
        <span className={`tools-tier tier-${p.tier}`}>T{p.tier}</span>
      </div>
      <div className="tools-card-cat">{p.category[lang]} · {p.kw}</div>
      <h3>{p.h1[lang].split(/[—(（]/)[0].trim()}</h3>
      <p>{p.lead[lang]}</p>
      <span className="tools-card-arrow">→</span>
    </Link>
  );

  return (
    <div className="hub-page">
      <header className="hub-hero">
        <div className="container hub-hero-inner">
          <span className="seo-kicker"><span className="seo-kicker-ic">◆</span>{u.kicker}</span>
          <h1>{u.h1}</h1>
          <p className="hub-lead">{u.lead}</p>
          <div className="hub-controls">
            <div className="hub-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={u.search} aria-label={u.search} />
              {q && <button type="button" onClick={() => setQ('')} aria-label="clear">✕</button>}
            </div>
            <div className="hub-seg">
              {([['all', u.all], [1, 'Tier 1'], [2, 'Tier 2']] as const).map(([v, label]) => (
                <button key={String(v)} type="button" className={tier === v ? 'on' : ''} onClick={() => setTier(v as any)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="hub-count">{total} {u.count}</div>
        </div>
      </header>

      <div className="container hub-body">
        {total === 0 && <div className="hub-empty">{u.empty}</div>}
        {shown1.length > 0 && (
          <section className="hub-group">
            <div className="hub-group-head"><h2>{u.t1}</h2><p>{u.t1sub}</p></div>
            <div className="tools-grid">{shown1.map((p) => <Card key={p.slug} p={p} />)}</div>
          </section>
        )}
        {shown2.length > 0 && (
          <section className="hub-group">
            <div className="hub-group-head"><h2>{u.t2}</h2><p>{u.t2sub}</p></div>
            <div className="tools-grid">{shown2.map((p) => <Card key={p.slug} p={p} />)}</div>
          </section>
        )}
      </div>

      <section className="seo-cta">
        <div className="container seo-cta-inner">
          <div><h2>{u.ctaTitle}</h2><p>{u.ctaSub}</p></div>
          <Link href="/canvas" className="btn btn-primary btn-lg">{u.ctaBtn}</Link>
        </div>
      </section>
    </div>
  );
}
