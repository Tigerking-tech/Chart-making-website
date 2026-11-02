// middleware.ts — 首访按 Accept-Language 设定默认语言并持久化到 cf-lang cookie。
// 之后用户用切换器改的语言会被 cookie 记住，这里直接尊重（不覆盖）。
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LANG_KEY } from './lib/i18n';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const existing = req.cookies.get(LANG_KEY)?.value;
  if (existing === 'zh' || existing === 'en') return res; // 已有用户选择，尊重之

  const accept = req.headers.get('accept-language') || '';
  const lang = /(^|,)en(-|;|,| )/i.test(accept) ? 'en' : 'zh';
  res.cookies.set(LANG_KEY, lang, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)'],
};
