// lib/lang-server.ts — 仅在服务端调用的取语言函数（依赖 next/headers，禁止被客户端组件 import）。
import 'server-only';
import { cookies, headers } from 'next/headers';
import { Lang, LANG_KEY, DEFAULT_LANG } from './i18n';

/** 取当前语言：优先 cookie（用户/切换器设定的），否则按 Accept-Language 推断。 */
export function getLang(): Lang {
  const c = cookies().get(LANG_KEY)?.value;
  if (c === 'en' || c === 'zh') return c;
  const accept = headers().get('accept-language') || '';
  return /(^|,)en(-|;|,| )/i.test(accept) ? 'en' : DEFAULT_LANG;
}
