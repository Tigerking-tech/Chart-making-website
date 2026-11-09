import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoTool, ToolsGrid, CompareTable } from '@/components/SeoTool';
import { SEO_PAGES, SEO_SLUGS, getSeoPage, type Lang } from '@/lib/seoPages';
import { getLang } from '@/lib/lang-server';
import { SITE_URL, SITE_NAME_FULL, abs } from '@/lib/site';

export function generateStaticParams() {
  return SEO_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getSeoPage(params.slug);
  if (!p) return {};
  const url = abs(`/tools/${p.slug}`);
  return {
    title: p.h1.en,
    description: p.desc.en,
    keywords: [p.kw, `${p.kw} online`, `free ${p.kw.toLowerCase()}`, 'SPC', 'ChartForge',
      ...p.related.map((s) => (getSeoPage(s)?.kw || s))],
    alternates: { canonical: url },
    openGraph: {
      type: 'website', url, siteName: SITE_NAME_FULL,
      title: p.h1.en, description: p.desc.en,
    },
    twitter: { card: 'summary_large_image', title: p.h1.en, description: p.desc.en },
    robots: { index: true, follow: true },
  };
}

function JsonLd({ obj }: { obj: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />;
}

export default function ToolPage({ params }: { params: { slug: string } }) {
  const p = getSeoPage(params.slug);
  if (!p) notFound();
  const lang: Lang = getLang();
  const zh = lang === 'zh';
  const url = abs(`/tools/${p.slug}`);
  const related = p.related.map((s) => getSeoPage(s)).filter(Boolean) as typeof SEO_PAGES;

  // —— 结构化数据：WebApplication + FAQPage + BreadcrumbList ——
  const appLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: p.h1.en, url, applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web', browserRequirements: 'Requires JavaScript',
    description: p.desc.en,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: { '@type': 'Organization', name: 'ChartForge', url: SITE_URL },
    featureList: p.features.map((f) => f.en),
  };
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: p.faq.map((item) => ({
      '@type': 'Question', name: item.q.en,
      acceptedAnswer: { '@type': 'Answer', text: item.a.en },
    })),
  };
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: zh ? '首页' : 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: zh ? '免费工具' : 'Free Tools', item: abs('/tools') },
      { '@type': 'ListItem', position: 3, name: p.kw, item: url },
    ],
  };

  const ui = {
    toolsTitle: zh ? '全部 20 个免费工具' : 'All 20 free tools',
    compareTitle: 'ChartForge vs Minitab',
    faqTitle: zh ? '常见问题' : 'Frequently asked questions',
    relatedTitle: zh ? '相关工具' : 'Related tools',
    aboutTitle: zh ? '关于这个工具' : 'About this tool',
    featTitle: zh ? '为什么用 ChartForge' : 'Why ChartForge',
    ctaTitle: zh ? '需要更完整的报告？' : 'Need a complete report?',
    ctaSub: zh ? '把多张图放进带公司品牌、可签字归档的 SPC 报告，一键导出 PDF / PPTX。'
      : 'Drop multiple charts into a brand-styled, sign-off-ready SPC report and export PDF / PPTX.',
    ctaBtn: zh ? '打开品牌画布 →' : 'Open Brand Canvas →',
    hubIntro: zh ? '下面 20 个工具全部免费、免注册、浏览器本地计算。' : 'All 20 tools below are free, sign-up-free and computed locally in your browser.',
    compareIntro: zh ? '我们不假装取代 Minitab，只把「轻量、零门槛、图能直接进汇报」这一段做到最好。差异摊开讲：'
      : 'We do not pretend to replace Minitab — we perfect the lightweight, zero-friction, slide-ready slice. Here is the honest comparison:',
    breadHome: zh ? '首页' : 'Home', breadTools: zh ? '免费工具' : 'Free Tools',
    stepUse: zh ? '三步出结果' : 'Three steps',
    steps: zh
      ? ['粘贴你的数据（CSV 或鱼骨图 JSON），或点「载入示例」。', '图表与统计指标实时更新；可加规格限、改子组大小、切主题。', '导出可编辑矢量 SVG / 高清 PNG，或在 Studio 里继续编辑。']
      : ['Paste your data (CSV or fishbone JSON), or click “Load sample”.', 'The chart and metrics update live — add spec limits, change subgroup size, switch themes.', 'Export editable SVG / hi-res PNG, or continue editing in Studio.'],
  };

  return (
    <>
      <JsonLd obj={appLd} />
      <JsonLd obj={faqLd} />
      <JsonLd obj={crumbLd} />

      {/* 面包屑 */}
      <div className="crumbs">
        <div className="container">
          <Link href="/">{ui.breadHome}</Link><span>/</span>
          <Link href="/tools">{ui.breadTools}</Link><span>/</span>
          <em>{p.kw}</em>
        </div>
      </div>

      {/* HERO */}
      <header className="seo-hero">
        <div className="container seo-hero-inner">
          <div className="seo-hero-copy">
            <div className="seo-kicker"><span className="seo-kicker-ic">{p.icon}</span>{p.category[lang]} · {p.kw}</div>
            <h1>{p.h1[lang]}</h1>
            <p className="seo-lead">{p.lead[lang]}</p>
            <div className="seo-hero-badges">
              <span className="seo-badge">✓ {zh ? '免费 · 免注册' : 'Free · No sign-up'}</span>
              <span className="seo-badge">✓ {zh ? '数据不上传' : 'Client-side only'}</span>
              <span className="seo-badge">✓ {zh ? '矢量 SVG / PNG 导出' : 'Vector SVG / PNG export'}</span>
            </div>
            <div className="seo-hero-cta">
              <a href="#tool" className="btn btn-primary">{zh ? '立即使用工具 ↓' : 'Use the tool ↓'}</a>
              <a href="#results" className="btn btn-ghost">{zh ? '看计算结果' : 'See results'}</a>
            </div>
          </div>
          <div className="seo-hero-art" aria-hidden="true">
            <span className="art-ring art-ring-1" /><span className="art-ring art-ring-2" />
            <span className="art-glyph">{p.icon}</span>
            <span className="art-chip art-chip-a">{zh ? '实时计算' : 'Live compute'}</span>
            <span className="art-chip art-chip-b">UCL / LCL</span>
            <span className="art-chip art-chip-c">{zh ? '矢量导出' : 'Vector export'}</span>
          </div>
        </div>
      </header>

      <div className="seo-page">
        {/* 工具主体 */}
        <section className="seo-tool-section" id="tool">
          <div className="container">
            <SeoTool page={p} lang={lang} />
          </div>
        </section>

        {/* 三步用法 */}
        <section className="seo-steps">
          <div className="container">
            <h2>{ui.stepUse}</h2>
            <div className="seo-steps-grid">
              {ui.steps.map((s, i) => (
                <div className="seo-step" key={i}><span className="seo-step-n">0{i + 1}</span><p>{s}</p></div>
              ))}
            </div>
          </div>
        </section>

        {/* Hub：全部工具网格 */}
        {p.mode === 'hub' && (
          <section className="seo-block alt">
            <div className="container">
              <div className="seo-block-head"><h2>{ui.toolsTitle}</h2><p>{ui.hubIntro}</p></div>
              <ToolsGrid lang={lang} />
            </div>
          </section>
        )}

        {/* Compare：对比表 */}
        {p.mode === 'compare' && (
          <section className="seo-block">
            <div className="container">
              <div className="seo-block-head"><h2>{ui.compareTitle}</h2><p>{ui.compareIntro}</p></div>
              <CompareTable lang={lang} />
            </div>
          </section>
        )}

        {/* 关于 / 实质内容 */}
        <section className="seo-block">
          <div className="container seo-about">
            <div className="seo-about-main">
              <h2>{ui.aboutTitle}</h2>
              {p.about.map((a, i) => <p key={i}>{a[lang]}</p>)}
            </div>
            <aside className="seo-feat">
              <h3>{ui.featTitle}</h3>
              <ul>{p.features.map((ft, i) => <li key={i}><span>✓</span>{ft[lang]}</li>)}</ul>
            </aside>
          </div>
        </section>

        {/* FAQ */}
        <section className="seo-block alt" id="faq">
          <div className="container seo-narrow">
            <h2 className="seo-center">{ui.faqTitle}</h2>
            <div className="seo-faq">
              {p.faq.map((item, i) => (
                <details key={i} className="seo-faq-item" open={i === 0}>
                  <summary><span className="seo-faq-q">{item.q[lang]}</span><span className="seo-faq-toggle">＋</span></summary>
                  <p>{item.a[lang]}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 内链：相关工具 */}
        <section className="seo-block">
          <div className="container">
            <h2>{ui.relatedTitle}</h2>
            <div className="seo-related">
              {related.map((r) => (
                <Link key={r.slug} href={`/tools/${r.slug}`} className="seo-related-card">
                  <span className="seo-related-ic">{r.icon}</span>
                  <span><strong>{r.kw}</strong><em>{r.category[lang]}</em></span>
                  <span className="seo-related-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="seo-cta">
          <div className="container seo-cta-inner">
            <div><h2>{ui.ctaTitle}</h2><p>{ui.ctaSub}</p></div>
            <Link href="/canvas" className="btn btn-primary btn-lg">{ui.ctaBtn}</Link>
          </div>
        </section>
      </div>
    </>
  );
}
