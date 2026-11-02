// 柱状图 Bar：分类对比（水平/垂直）
import { svgOpen, svgClose, text, line, rect, niceScale, scale, esc } from '../base.js';
import { emitOverlay, makePlot, drawErrorBars } from './overlays.js';

export function renderBar(data, theme, opts = {}) {
  const horizontal = !!opts.horizontal;
  const showTitle = opts.showTitle !== false;
  const dataLabels = opts.dataLabels !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const m = { top: showTitle ? 72 : 44, right: 72, bottom: 72, left: 80 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const cats = data.categories, vals = data.values;
  const yMax = Math.max(...vals);
  const yScale = niceScale(0, yMax, 6);
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Bar Chart' : '柱状图 Bar'), theme, { size: 20, weight: '700' });
  if (showTitle && opts.subtitle) s += text(m.left, 56, opts.subtitle, theme, { size: 12, color: theme.muted });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  const errs = opts.errs || null;

  let ctx;
  if (!horizontal) {
    const xCenter = (i) => m.left + ((i + 0.5) / cats.length) * pw;
    const bw = (pw / cats.length) * 0.6;
    if (major) yScale.ticks.forEach((t) => {
      const y = yOf(t);
      s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
      s += text(m.left - 10, y + 4, String(t), theme, { size: 11, color: theme.gridText, anchor: 'end' });
    });
    vals.forEach((v, i) => {
      const y = yOf(v);
      s += rect(xCenter(i) - bw / 2, y, bw, m.top + ph - y, theme, { fill: theme.accent, rx: 2 });
      if (dataLabels) s += text(xCenter(i), y - 8, String(v), theme, { size: 11, color: theme.ink, anchor: 'middle', weight: '600' });
      s += text(xCenter(i), m.top + ph + 22, esc(cats[i]), theme, { size: 11, color: theme.muted, anchor: 'middle' });
      if (errs && errs[i] != null) s += drawErrorBars({ m, pw, xOf: (v) => xCenter(i), yOf }, [{ x: 0, y: v, ymin: v - errs[i], ymax: v + errs[i] }], theme);
    });
    s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
    ctx = { m, pw, ph, xOf: xCenter, yOf, xType: 'category', yType: 'linear', xMin: 0, xMax: cats.length - 1, yMin: yScale.min, yMax: yScale.max, xStep: 1, yStep: yScale.step };
  } else {
    const yCenter = (i) => m.top + ((i + 0.5) / cats.length) * ph;
    const bh = (ph / cats.length) * 0.6;
    const xOf = scale(yScale.min, yScale.max, m.left, m.left + pw);
    if (major) yScale.ticks.forEach((t) => {
      const x = xOf(t);
      s += line(x, m.top, x, m.top + ph, theme, { color: theme.grid, width: 1 });
      s += text(x, m.top + ph + 22, String(t), theme, { size: 11, color: theme.gridText, anchor: 'middle' });
    });
    vals.forEach((v, i) => {
      const x = xOf(v);
      s += rect(m.left, yCenter(i) - bh / 2, x - m.left, bh, theme, { fill: theme.accent, rx: 2 });
      if (dataLabels) s += text(x + 8, yCenter(i) + 4, String(v), theme, { size: 11, color: theme.ink, anchor: 'start', weight: '600' });
      s += text(m.left - 10, yCenter(i) + 4, esc(cats[i]), theme, { size: 11, color: theme.muted, anchor: 'end' });
      if (errs && errs[i] != null) s += drawErrorBars({ m, ph, yOf: yCenter, xOf }, [{ y: 0, x: v, xmin: v - errs[i], xmax: v + errs[i] }], theme);
    });
    s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
    ctx = { m, pw, ph, xOf, yOf: yCenter, xType: 'linear', yType: 'category', xMin: yScale.min, xMax: yScale.max, yMin: 0, yMax: cats.length - 1, xStep: yScale.step, yStep: 1 };
  }
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
