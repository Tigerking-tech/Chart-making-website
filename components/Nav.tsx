'use client';
import Link from 'next/link';
import { Lang, t } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Nav({ lang }: { lang: Lang }) {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo"><span className="dot" /> ChartForge</Link>
        <div className="nav-links">
          <Link href="/studio">{t(lang, 'nav.studio')}</Link>
          <Link href="/report">{t(lang, 'nav.report')}</Link>
          <Link href="/gallery">{t(lang, 'nav.gallery')}</Link>
          <Link href="/canvas">{t(lang, 'nav.canvas')}</Link>
          <Link href="/figures4papers">{t(lang, 'nav.paper')}</Link>
          <Link href="/pricing">{t(lang, 'nav.pricing')}</Link>
          <Link href="/#features">{t(lang, 'nav.features')}</Link>
        </div>
        <div className="nav-right">
          <LanguageSwitcher lang={lang} />
          <Link href="/studio" className="btn btn-primary">{t(lang, 'nav.cta')}</Link>
        </div>
      </div>
    </nav>
  );
}
