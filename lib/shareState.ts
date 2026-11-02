// lib/shareState.ts — 把工作区状态压缩进 URL，实现「复制链接即分享 / 打开链接即还原」。
// 采用 lz-string（浏览器友好，无需 Node 依赖），状态以 JSON 序列化后压缩为 URL-safe 串。
import LZString from 'lz-string';

export function encodeState(obj: Record<string, any>): string {
  try {
    return LZString.compressToEncodedURIComponent(JSON.stringify(obj));
  } catch {
    return '';
  }
}

export function decodeState(s: string): any | null {
  if (!s) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** 生成带 #s= 的分享链接。 */
export function shareUrl(obj: Record<string, any>, base?: string): string {
  const enc = encodeState(obj);
  if (!enc) return base || (typeof window !== 'undefined' ? window.location.href : '');
  const url = new URL(base || (typeof window !== 'undefined' ? window.location.href : 'http://localhost'));
  url.hash = 's=' + enc;
  return url.toString();
}

/** 从当前 URL 解析分享状态（读取 location.hash 中的 s=）。 */
export function readSharedState(): any | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(/s=([^&]+)/);
  if (!m) return null;
  return decodeState(decodeURIComponent(m[1]));
}
