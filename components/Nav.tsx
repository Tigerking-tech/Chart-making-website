'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lang, t } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SEO_PAGES, type SeoPage } from '@/lib/seoPages';

// 下拉里展示的高频工具（Tier 1 前 6 个）
const TOOL_SLUGS = ['cpk-calculator', 'control-chart-maker', 'xbar-r-chart', 'gage-rr-calculator', 'pareto-chart-maker', 'histogram-maker'];
const TOOL_LINKS = TOOL_SLUGS.map((s) => SEO_PAGES.find((p) => p.slug === s)!).filter(Boolean) as SeoPage[];

export function Nav({ lang }: { lang: Lang }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const links = (
    <>
      <Link href="/studio">{t(lang, 'nav.studio')}</Link>
      <Link href="/report">{t(lang, 'nav.report')}</Link>
      <Link href="/gallery">{t(lang, 'nav.gallery')}</Link>
      <Link href="/canvas">{t(lang, 'nav.canvas')}</Link>
      <Link href="/figures4papers">{t(lang, 'nav.paper')}</Link>
      <Link href="/paper-figures">{t(lang, 'nav.forge')}</Link>
      <Link href="/pricing">{t(lang, 'nav.pricing')}</Link>
    </>
  );

  return (
    <>
    <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="dot" /><span className="logo-word">ChartForge</span>
        </Link>

        {/* 桌面主导航 + 工具下拉 */}
        <div className="nav-links">
          <div className="nav-drop">
            <Link href="/tools" className="nav-drop-trigger nav-tools-link">
              {t(lang, 'nav.tools')}<span className="nav-caret">▾</span>
            </Link>
            <div className="nav-drop-menu">
              <div className="nav-drop-head">
                <strong>{lang === 'zh' ? '免费在线工具' : 'Free online tools'}</strong>
                <Link href="/tools">{lang === 'zh' ? '查看全部 20 个 →' : 'See all 20 →'}</Link>
              </div>
              <div className="nav-drop-grid">
                {TOOL_LINKS.map((p) => (
                  <Link key={p.slug} href={`/tools/${p.slug}`} className="nav-drop-item">
                    <span className="nav-drop-ic">{p.icon}</span>
                    <span><em>{p.kw}</em><small>{p.category[lang]}</small></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {links}
          <Link href="/#features">{t(lang, 'nav.features')}</Link>
        </div>

        <div className="nav-right">
          <LanguageSwitcher lang={lang} />
          <Link href="/studio" className="btn btn-primary nav-cta">{t(lang, 'nav.cta')}</Link>
          <button
            type="button"
            className={`nav-burger ${menuOpen ? 'on' : ''}`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          ><span /><span /><span /></button>
        </div>
      </div>

    </nav>

    {/* 移动端抽屉：必须放在 <nav> 之外 —— nav 的 backdrop-filter 会创建包含块，
        使内部 position:fixed 相对 nav 定位而被裁切。 */}
    <div className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
      <div className="nav-mobile-inner">
        <Link href="/tools" className="nav-mobile-lead" onClick={() => setMenuOpen(false)}>
          {t(lang, 'nav.tools')} <span>→</span>
        </Link>
        <div className="nav-mobile-tools">
          {TOOL_LINKS.map((p) => (
            <Link key={p.slug} href={`/tools/${p.slug}`} onClick={() => setMenuOpen(false)}>{p.kw}</Link>
          ))}
        </div>
        <div className="nav-mobile-links">
          {links}
          <Link href="/#features" onClick={() => setMenuOpen(false)}>{t(lang, 'nav.features')}</Link>
        </div>
        <div className="nav-mobile-lang"><LanguageSwitcher lang={lang} /></div>
      </div>
    </div>
    {menuOpen && <button type="button" className="nav-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
