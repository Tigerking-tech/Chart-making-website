// 品牌接入：把用户/官网的配色收敛成语义 token，并做 WCAG 对比度自检
import { makeBrandTheme, contrast } from './themes.js';

/**
 * 由 主色/辅色/字体 生成品牌主题。
 * 默认把浅色骨架的 paper/ink/muted/grid 沿用，只替换 accent / accent2 / font。
 */
export function brandTheme({ accent, accent2, font, name }) {
  return makeBrandTheme({ accent, accent2, font, name });
}

/**
 * 对比度自检：保证 accent 落在白底上满足 WCAG AA。
 * 返回 { ok, ratio, message }。
 */
export function checkContrast(accent, bg = '#ffffff') {
  const ratio = contrast(accent, bg);
  return {
    ratio: +ratio.toFixed(2),
    ok: ratio >= 4.5,
    message: ratio >= 4.5 ? '满足 WCAG AA 正文对比度' : '对比度偏低，小字可能看不清（建议加深主色）',
  };
}

/**
 * 从网址提取品牌色（经本地后端代理，规避浏览器 CORS）。
 * 后端 /api/brand 抓取页面并抽取: 含 color/background 的内联样式、<link> 预加载的主色、
 * 以及 meta theme-color。返回 { accent, accent2, font }。
 */
export async function fetchBrandFromUrl(url) {
  const resp = await fetch('/api/brand?url=' + encodeURIComponent(url));
  if (!resp.ok) throw new Error('品牌抓取失败');
  return resp.json();
}
