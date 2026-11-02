// ===========================================================================
// base.js — 设计系统原语
// 设计铁律（继承 diagram-design 的编辑级风格）：
//   · 无阴影（no shadows）
//   · 发丝线（hairline stroke，默认 1px）
//   · 4px 栅格（GRID）
//   · 克制的强调色（accent 仅用于关键数据/异常，其余用 ink/muted）
// 所有图表都通过这些原语产出"自包含 SVG 字符串"，可直接落进 PPT/报告。
// ===========================================================================

export const GRID = 4;

/** HTML 转义，避免数据里的 < > & 破坏 SVG。 */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 开标签：命名空间固定，role=img 保证可访问性，宽度 100% 自适应容器。 */
export function svgOpen(w, h, theme) {
  const font = (theme && theme.font) ? theme.font : "'Inter','Helvetica Neue',Arial,sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" font-family='${font}' role="img">`;
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
  const color = opts.color ?? (theme ? theme.grid : '#EAECEF');
  const width = opts.width ?? 1;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const opacity = opts.opacity != null ? ` opacity="${opts.opacity}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dash}${opacity}/>`;
}

export function rect(x, y, w, h, theme, opts = {}) {
  const fill = opts.fill ?? 'none';
  const stroke = opts.stroke ?? 'none';
  const sw = opts.sw ?? 1;
  const rx = opts.rx ?? 0;
  const opacity = opts.opacity != null ? ` opacity="${opts.opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacity}/>`;
}

export function circle(cx, cy, r, fill, opts = {}) {
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
