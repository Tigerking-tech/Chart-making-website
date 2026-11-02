// 柏拉图 Pareto：柱形（降序）+ 累计百分比折线（右轴封顶 100%）
import { svgOpen, svgClose, text, line, rect, circle, niceScale, scale, esc, legendLayout, drawLegend } from '../base.js';

export function renderPareto(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const dataLabels = opts.dataLabels !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const { m, pos } = legendLayout({ top: showTitle ? 72 : 44, right: 72, bottom: 72, left: 64 }, opts);
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const idx = [...data.values.keys()].sort((a, b) => data.values[b] - data.values[a]);
  const cats = idx.map((i) => data.categories[i]);
  const vals = idx.map((i) => data.values[i]);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  const cumPct = vals.map((v) => { cum += v; return cum / total; });

  const yScale = niceScale(0, Math.max(...vals), 6);
  const xCenter = (i) => m.left + ((i + 0.5) / cats.length) * pw;
  const bw = (pw / cats.length) * 0.62;
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const rOf = (p) => m.top + ph - p * ph; // 右侧 0..1

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Pareto Chart' : '柏拉图 Pareto'), theme, { size: 20, weight: '700' });
  if (showTitle && opts.subtitle) s += text(m.left, 56, opts.subtitle, theme, { size: 12, color: theme.muted });

  // 左轴网格 + 刻度
  yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 10, y + 4, String(t), theme, { size: 11, color: theme.gridText, anchor: 'end' });
  });

  // 柱
  vals.forEach((v, i) => {
    const y = yOf(v);
    const bh = m.top + ph - y;
    s += rect(xCenter(i) - bw / 2, y, bw, bh, theme, { fill: theme.accent, rx: 2 });
    if (dataLabels) s += text(xCenter(i), y - 8, String(v), theme, { size: 11, color: theme.ink, anchor: 'middle', weight: '600' });
  });

  // 累计折线
  let d = '';
  cumPct.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + xCenter(i) + ' ' + rOf(p) + ' '; });
  s += `<path d="${d}" fill="none" stroke="${theme.accent2}" stroke-width="2.5"/>`;
  cumPct.forEach((p, i) => {
    s += circle(xCenter(i), rOf(p), 3.5, theme.accent2);
    if (dataLabels) s += text(xCenter(i), rOf(p) - 12, (p * 100).toFixed(0) + '%', theme, { size: 10, color: theme.accent2, anchor: 'middle' });
  });

  // 右轴刻度
  [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
    s += text(m.left + pw + 10, rOf(p) + 4, (p * 100).toFixed(0) + '%', theme, { size: 10, color: theme.accent2, anchor: 'start' });
  });

  // 类目标签
  cats.forEach((c, i) => {
    s += text(xCenter(i), m.top + ph + 22, esc(c), theme, { size: 11, color: theme.muted, anchor: 'middle' });
  });

  // 轴线
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left + pw, m.top, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });

  // 图例（频数 / 累计%）
  const legendItems = [
    { label: L ? 'Frequency' : '频数', color: theme.accent, shape: 'rect' },
    { label: L ? 'Cumulative %' : '累计 %', color: theme.accent2, shape: 'line' },
  ];
  if (pos === 'right') s += drawLegend(legendItems, theme, 'right', { x: m.left + pw + 14, y: m.top + 14 });
  else if (pos === 'bottom') s += drawLegend(legendItems, theme, 'bottom', { x: m.left, y: m.top + ph + 40, w: pw });

  s += `</svg>`;
  return s;
}
