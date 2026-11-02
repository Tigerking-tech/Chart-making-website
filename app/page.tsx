import Link from 'next/link';
import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Home() {
  const lang = getLang();

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <span className="pill">{t(lang, 'home.pill')}</span>
          <h1>{t(lang, 'home.h1')}</h1>
          <p className="lead">{t(lang, 'home.lead')}</p>
          <div className="hero-lang">
            <span className="hero-lang-label">{t(lang, 'home.pickLang')}</span>
            <LanguageSwitcher lang={lang} variant="hero" />
          </div>
          <div className="hero-cta">
            <Link href="/studio" className="btn btn-primary">{t(lang, 'home.cta1')}</Link>
            <Link href="/gallery" className="btn btn-ghost">{t(lang, 'home.cta2')}</Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section alt" id="features">
        <div className="container">
          <h2>{t(lang, 'home.featuresH2')}</h2>
          <p className="sub">{t(lang, 'home.featuresSub')}</p>
          <div className="cards">
            <div className="card"><h3>{t(lang, 'home.c1h')}</h3><p>{t(lang, 'home.c1p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.c2h')}</h3><p>{t(lang, 'home.c2p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.c3h')}</h3><p>{t(lang, 'home.c3p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.c4h')}</h3><p>{t(lang, 'home.c4p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.c5h')}</h3><p>{t(lang, 'home.c5p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.c6h')}</h3><p>{t(lang, 'home.c6p')}</p></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <h2>{t(lang, 'home.howH2')}</h2>
          <p className="sub">{t(lang, 'home.howSub')}</p>
          <div className="cards">
            <div className="card"><h3>{t(lang, 'home.how1h')}</h3><p>{t(lang, 'home.how1p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.how2h')}</h3><p>{t(lang, 'home.how2p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.how3h')}</h3><p>{t(lang, 'home.how3p')}</p></div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section alt">
        <div className="container">
          <h2>{t(lang, 'home.cmpH2')}</h2>
          <p className="sub">{t(lang, 'home.cmpSub')}</p>
          <div className="cards">
            <div className="card"><h3>{t(lang, 'home.cmp1h')}</h3><p>{t(lang, 'home.cmp1p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.cmp2h')}</h3><p>{t(lang, 'home.cmp2p')}</p></div>
            <div className="card"><h3>{t(lang, 'home.cmp3h')}</h3><p>{t(lang, 'home.cmp3p')}</p></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2>{t(lang, 'home.ctaH2')}</h2>
          <p className="sub">{t(lang, 'home.ctaSub')}</p>
          <Link href="/studio" className="btn btn-primary">{t(lang, 'home.ctaBtn')}</Link>
        </div>
      </section>
    </>
  );
}
