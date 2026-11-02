// CUSUM 控制图（累积和）：双侧，C+（向上偏移）/ C-（向下偏移）+ 决策区间 H。
import { svgOpen, svgClose, text, line, circle, path, niceScale, scale, spcAxes, yGrid, xLabels, drawLegend, legendLayout } from '../base.js';
import { cusum } from './spc.js';
import { emitOverlay, makePlot } from './overlays.js';

export function renderCusum(values, theme, opts = {}) {
  const W = opts.w || 880, H = opts.h || 520;
  const r = cusum(values, opts.k ?? null, opts.H ?? null);
  const top = Math.max(...r.cu, ...r.cl, r.HH);
  const yScale = niceScale(0, top, 6);
  const { m, pos } = legendLayout({ top: 64, right: 64, bottom: 64, left: 72 }, opts);
  if (pos === 'right') m.right += 120; else if (pos === 'bottom') m.bottom += 50;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const L = opts.lang === 'en';
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / values.length) * pw;
  const sub = (L ? `k=${r.kk.toFixed(3)} · H=${r.HH.toFixed(3)}` : `参考值 k=${r.kk.toFixed(3)} · 决策区间 H=${r.HH.toFixed(3)}`);
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  let s = svgOpen(W, H, theme);
  s += spcAxes(W, H, theme, { ...opts, subtitle: opts.subtitle || sub }).s;
  if (major) s += yGrid(m, pw, ph, yScale, theme);

  // 零线 + 决策区间 ±H
  s += line(m.left, yOf(0), m.left + pw, yOf(0), theme, { color: theme.muted, width: 1 });
  s += line(m.left, yOf(r.HH), m.left + pw, yOf(r.HH), theme, { color: theme.accent2, width: 1, dash: '4 4' });
  s += line(m.left, yOf(-r.HH), m.left + pw, yOf(-r.HH), theme, { color: theme.accent2, width: 1, dash: '4 4' });

  const env = (arr) => {
    let d = `M${xOf(0)} ${yOf(arr[0])}`;
    arr.forEach((v, i) => { if (i > 0) d += ` L${xOf(i)} ${yOf(v)}`; });
    return d;
  };
  s += path(env(r.cu), { stroke: theme.accent, sw: 2.5 });
  s += path(env(r.cl), { stroke: theme.accent2, sw: 2.5 });
  values.forEach((_, i) => {
    if (r.flags[i]) { s += circle(xOf(i), yOf(r.cu[i]), 4.5, theme.accent); s += circle(xOf(i), yOf(r.cl[i]), 4.5, theme.accent2); }
  });

  s += xLabels(m, pw, ph, values.map((_, i) => i + 1), theme);
  if (pos !== 'none') {
    const items = [
      { label: L ? 'C⁺ (up shift)' : 'C⁺（向上偏移）', color: theme.accent, shape: 'line' },
      { label: L ? 'C⁻ (down shift)' : 'C⁻（向下偏移）', color: theme.accent2, shape: 'line' },
    ];
    s += drawLegend(items, theme, pos, pos === 'right' ? { x: m.left + pw + 16, y: m.top + 18 } : { x: m.left, y: m.top + ph + 34, w: pw });
  }
  const ctx = { m, pw, ph, xOf, yOf, xType: 'category', yType: 'linear', xMin: 0, xMax: values.length - 1, yMin: yScale.min, yMax: yScale.max, xStep: 1, yStep: yScale.step };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
