'use client';
import { Lang, t } from '@/lib/i18n';

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer>
      <div className="container foot-inner">
        <div>{t(lang, 'footer.tagline')}</div>
        <div>
          <a href="/studio">Studio</a> · <a href="/gallery">Gallery</a> · <a href="/pricing">Pricing</a> · <a href="/llms.txt">llms.txt</a>
        </div>
      </div>
    </footer>
  );
}
