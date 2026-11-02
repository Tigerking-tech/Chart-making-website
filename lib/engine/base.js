// ===========================================================================
// base.js — 设计系统原语
// 设计铁律（继承 diagram-design 的编辑级风格）：
//   · 无阴影（no shadows）
//   · 发丝线（hairline stroke，默认 1px）
//   · 4px 栅格（GRID）
//   · 克制的强调色（accent 仅用于关键数据/异常，其余用 ink/muted）
// 所有图表都通过这些原语产出"自包含 SVG 字符串"，可直接落进 PPT/报告。
// 手绘风（theme.style === 'hand'）由 rough.js 接管 line/rect/circle —— 见 rough-svg.js。
// ===========================================================================

import { roughLine, roughRect, roughCircle } from './rough-svg.js';

export const GRID = 4;

/** 当前渲染的主题（由 svgOpen 设置），用于让 line/rect/circle 判断是否手绘风。 */
let _theme = null;
export function setTheme(t) { _theme = t; }
const hand = () => _theme && _theme.style === 'hand';

/** HTML 转义，避免数据里的 < > & 破坏 SVG。 */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 开标签：命名空间固定，role=img 保证可访问性，宽度 100% 自适应容器。
 *  font 属性必须用双引号包裹（字体栈通常含单引号，如 'Inter',Arial——
 *  单引号包裹会产生非法 XML，导致 Image 栅格化 / PNG / PPTX 导出失败）。 */
export function svgOpen(w, h, theme) {
  setTheme(theme);
  const font = (theme && theme.font) ? theme.font : "'Inter','Helvetica Neue',Arial,sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="${String(font).replace(/"/g, '&quot;')}" role="img">`;
}

export function svgClose() {
  return '</svg>';
}

export function text(x, y, str, theme, opts = {}) {
  const size = opts.size ?? 13;
  const color = opts.color ?? (theme ? theme.ink : '#1f2430');
  const anchor = opts.anchor ?? 'start';
  const weight = opts.weight ?? 'normal';
  const baseline = opts.baseline ?? 'alphabetic';
  const rot = opts.rotate ? ` transform="rotate(${opts.rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}" dominant-baseline="${baseline}"${rot}>${esc(str)}</text>`;
}

export function line(x1, y1, x2, y2, theme, opts = {}) {
  if (hand()) return roughLine(x1, y1, x2, y2, opts);
  const color = opts.color ?? (theme ? theme.grid : '#EAECEF');
  const width = opts.width ?? 1;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const opacity = opts.opacity != null ? ` opacity="${opts.opacity}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dash}${opacity}/>`;
}

export function rect(x, y, w, h, theme, opts = {}) {
  if (hand()) return roughRect(x, y, w, h, opts);
  const fill = opts.fill ?? 'none';
  const stroke = opts.stroke ?? 'none';
  const sw = opts.sw ?? 1;
  const rx = opts.rx ?? 0;
  const opacity = opts.opacity != null ? ` opacity="${opts.opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacity}/>`;
}

export function circle(cx, cy, r, fill, opts = {}) {
  // 手绘风：大圆形走 rough；小数据点（r<8）保持实心，避免斜线填充+浅描边导致点不可见
  if (hand() && r >= 8) return roughCircle(cx, cy, r, fill, opts);
  const stroke = opts.stroke ?? 'none';
  const sw = opts.sw ?? 1;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function path(d, opts = {}) {
  const stroke = opts.stroke ?? 'none';
  const fill = opts.fill ?? 'none';
  const sw = opts.sw ?? 2;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
}

// ---------------------------------------------------------------------------
// "Nice numbers" 算法：把坐标轴上限/下限/步长取成好看的 1/2/5 整数倍。
// ---------------------------------------------------------------------------
export function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  let nice;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exp);
}

export function niceScale(min, max, maxTicks = 6) {
  if (min === max) { min -= 1; max += 1; }
  const range = niceNum(max - min, false);
  const step = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(+v.toFixed(10));
  return { min: niceMin, max: niceMax, step, ticks };
}

/** 线性比例尺：domain -> range。 */
export function scale(domainMin, domainMax, rangeMin, rangeMax) {
  const d = (domainMax - domainMin) || 1;
  return (v) => rangeMin + ((v - domainMin) / d) * (rangeMax - rangeMin);
}

/** 通用绘图边框：标题、副标题、左右下坐标轴骨架。返回拼接好的 SVG 片段与刻度坐标。 */
export function frame(W, H, theme, opts = {}) {
  const m = opts.margins || { top: 64, right: 64, bottom: 64, left: 64 };
  const pw = W - m.left - m.right;
  const ph = H - m.top - m.bottom;
  let s = '';
  s += text(m.left, 36, opts.title || '图表', theme, { size: 20, weight: '700', color: theme.ink });
  if (opts.subtitle) s += text(m.left, 54, opts.subtitle, theme, { size: 12, color: theme.muted });
  // 坐标轴
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  return { s, m, pw, ph };
}

// ---------------------------------------------------------------------------
// SPC 图族公共框：标题（受 showTitle 控制）、坐标轴、按 legend 让出空间。
// 返回 { s, m, pw, ph }，供 EWMA/CUSUM/Run/NP/U 等控制图复用。
// ---------------------------------------------------------------------------
export function spcAxes(W, H, theme, opts = {}) {
  const pos = opts.legend === 'right' ? 'right' : opts.legend === 'bottom' ? 'bottom' : 'none';
  const m = { top: (opts.showTitle === false ? 30 : 64), right: 64, bottom: 64, left: 72 };
  if (pos === 'right') m.right += 120;
  else if (pos === 'bottom') m.bottom += 50;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  let s = '';
  if (opts.showTitle !== false) {
    s += text(m.left, 38, opts.title || 'Chart', theme, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(m.left, 56, opts.subtitle, theme, { size: 12, color: theme.muted });
  }
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  return { s, m, pw, ph };
}

/** 水平网格 + Y 轴刻度标签（基于 niceScale）。 */
export function yGrid(m, pw, ph, yScale, theme, fmt) {
  const fmtFn = fmt || ((v) => String(+v.toFixed(2)));
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  let s = '';
  for (const v of yScale.ticks) {
    const y = yOf(v);
    if (y < m.top - 0.5 || y > m.top + ph + 0.5) continue;
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, fmtFn(v), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  }
  return s;
}

/** X 轴等距刻度标签（labels 为字符串数组）。 */
export function xLabels(m, pw, ph, labels, theme) {
  const n = labels.length;
  if (!n) return '';
  let s = '';
  labels.forEach((lab, i) => {
    const x = m.left + ((i + 0.5) / n) * pw;
    s += text(x, m.top + ph + 18, String(lab), theme, { size: 10, color: theme.gridText, anchor: 'middle' });
  });
  return s;
}

// ---------------------------------------------------------------------------
// 图例与布局：结构化布局开关（Route B）的通用原语。
// legendLayout 根据 opts.legend 调整绘图边距，为图例腾出右栏或底部条带；
// drawLegend 在该区域绘制“色块/线型 + 标签”。两者配合实现“图例位置”控制。
// ---------------------------------------------------------------------------

/** 根据 opts.legend 返回调整后的边距与图例位置。
 *  pos: 'right'（右栏）| 'bottom'（底部条带）| 'none'（不显示）。 */
export function legendLayout(baseM, opts = {}) {
  const pos = opts.legend === 'right' || opts.legend === 'bottom' ? opts.legend : 'none';
  const m = { ...baseM };
  if (pos === 'right') m.right = (baseM.right || 64) + 124;
  else if (pos === 'bottom') m.bottom = (baseM.bottom || 64) + 52;
  return { m, pos };
}

/** 绘制图例。items: [{ label, color, shape: 'rect'|'line'|'circle' }]。
 *  geo: right → {x, y}（起点）；bottom → {x, y, w}（条带范围，标签水平居中）。 */
export function drawLegend(items, theme, pos, geo) {
  if (!items || !items.length || (pos !== 'right' && pos !== 'bottom')) return '';
  let s = '';
  const drawItem = (it, x, cy) => {
    if (it.shape === 'line') s += line(x, cy, x + 20, cy, theme, { color: it.color, width: 2.5 });
    else if (it.shape === 'circle') s += circle(x + 10, cy, 5, it.color);
    else s += rect(x, cy - 7, 14, 14, theme, { fill: it.color, rx: 2 });
    s += text(x + 26, cy + 4, it.label, theme, { size: 11, color: theme.ink });
  };
  if (pos === 'right') {
    const x = geo.x, y0 = geo.y, rowH = 24;
    items.forEach((it, i) => drawItem(it, x, y0 + i * rowH + 7));
  } else {
    const cjk = (str) => /[一-龥]/.test(str);
    const widths = items.map((it) => 26 + it.label.length * (cjk(it.label) ? 12 : 7));
    const gap = 28;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = geo.x + Math.max(0, (geo.w - total) / 2);
    const cy = geo.y;
    items.forEach((it, i) => { drawItem(it, x, cy); x += widths[i] + gap; });
  }
  return s;
}
