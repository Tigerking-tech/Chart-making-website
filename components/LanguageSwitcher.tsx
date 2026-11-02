'use client';
import { useRouter } from 'next/navigation';
import { Lang, LANG_KEY, LANGS } from '@/lib/i18n';

export function LanguageSwitcher({ lang, variant = 'nav' }: { lang: Lang; variant?: 'nav' | 'hero' }) {
  const router = useRouter();

  function pick(next: Lang) {
    if (next === lang) return;
    document.cookie = `${LANG_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
    router.refresh();
  }

  return (
    <div className={`lang-switch ${variant === 'hero' ? 'lang-hero' : ''}`} role="group" aria-label="Language / 语言">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'on' : ''}
          aria-pressed={l.code === lang}
          title={l.title}
          onClick={() => pick(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
