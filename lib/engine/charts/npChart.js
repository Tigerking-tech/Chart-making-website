// NP 控制图（不良数，样本量恒定）：与 p 图等价，直接绘不良计数。
import { svgOpen, svgClose, line, circle, niceScale, scale, spcAxes, yGrid, xLabels } from '../base.js';
import { npChart } from './spc.js';
import { emitOverlay, makePlot } from './overlays.js';

export function renderNp(defectives, sizes, theme, opts = {}) {
  const W = opts.w || 880, H = opts.h || 520;
  const r = npChart(defectives, sizes);
  const yScale = niceScale(0, Math.max(...defectives, r.ucl), 6);
  const m = { top: 64, right: 64, bottom: 64, left: 72 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const L = opts.lang === 'en';
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / defectives.length) * pw;
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  let s = svgOpen(W, H, theme);
  s += spcAxes(W, H, theme, { ...opts, subtitle: opts.subtitle || (L ? `CL=${r.cl.toFixed(2)} · UCL=${r.ucl.toFixed(2)}` : `CL=${r.cl.toFixed(2)} · UCL=${r.ucl.toFixed(2)}`) }).s;
  if (major) s += yGrid(m, pw, ph, yScale, theme);

  // 控制限
  s += line(m.left, yOf(r.cl), m.left + pw, yOf(r.cl), theme, { color: theme.muted, width: 1, dash: '4 4' });
  s += line(m.left, yOf(r.ucl), m.left + pw, yOf(r.ucl), theme, { color: theme.accent2, width: 1, dash: '4 4' });
  s += line(m.left, yOf(r.lcl), m.left + pw, yOf(r.lcl), theme, { color: theme.accent2, width: 1, dash: '4 4' });

  // 点
  defectives.forEach((d, i) => {
    if (r.points[i].flag) s += circle(xOf(i), yOf(d), 5, theme.accent2);
    else s += circle(xOf(i), yOf(d), 3.5, theme.accent);
  });

  s += xLabels(m, pw, ph, defectives.map((_, i) => i + 1), theme);
  const ctx = { m, pw, ph, xOf, yOf, xType: 'category', yType: 'linear', xMin: 0, xMax: defectives.length - 1, yMin: yScale.min, yMax: yScale.max, xStep: 1, yStep: yScale.step };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
