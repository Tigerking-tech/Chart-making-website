'use client';
import Link from 'next/link';
import { Lang, t } from '@/lib/i18n';
import { TIER1, TIER2 } from '@/lib/seoPages';

export function Footer({ lang }: { lang: Lang }) {
  const zh = lang === 'zh';
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <Link href="/" className="logo"><span className="dot" /><span className="logo-word">ChartForge</span></Link>
          <p>{zh
            ? '面向质量 / 运营 / 数据人群的 Web 图表工坊。统计正确、编辑级美观、打开即用。'
            : 'A web chart studio for quality, ops and data teams. Statistically correct, editorial by design, ready in a browser.'}</p>
          <div className="footer-free">
            <span>✓ {zh ? '免费' : 'Free'}</span>
            <span>✓ {zh ? '免注册' : 'No sign-up'}</span>
            <span>✓ {zh ? '数据不上传' : 'Client-side'}</span>
          </div>
        </div>
        <div className="footer-col">
          <h4>{zh ? '产品' : 'Product'}</h4>
          <Link href="/studio">{t(lang, 'nav.studio')}</Link>
          <Link href="/tools">{t(lang, 'nav.tools')}</Link>
          <Link href="/report">{t(lang, 'nav.report')}</Link>
          <Link href="/canvas">{t(lang, 'nav.canvas')}</Link>
          <Link href="/gallery">{t(lang, 'nav.gallery')}</Link>
          <Link href="/pricing">{t(lang, 'nav.pricing')}</Link>
        </div>
        <div className="footer-col">
          <h4>{zh ? '热门免费工具' : 'Popular tools'}</h4>
          {TIER1.slice(0, 7).map((p) => <Link key={p.slug} href={`/tools/${p.slug}`}>{p.kw}</Link>)}
        </div>
        <div className="footer-col">
          <h4>{zh ? '更多工具' : 'More tools'}</h4>
          {[...TIER1.slice(7), ...TIER2.slice(0, 6)].map((p) => <Link key={p.slug} href={`/tools/${p.slug}`}>{p.kw}</Link>)}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>{t(lang, 'footer.tagline')}</span>
        <span className="footer-bottom-links">
          <Link href="/tools">{zh ? '全部工具' : 'All tools'}</Link> · <Link href="/llms.txt">llms.txt</Link> · <Link href="/traffic">{zh ? '来源归因' : 'Attribution'}</Link> · <Link href="/sitemap.xml">Sitemap</Link>
        </span>
      </div>
    </footer>
  );
}
