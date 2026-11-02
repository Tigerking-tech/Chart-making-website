// U 控制图（单位缺陷数，样本量可变）：每个子组控制限随样本量变化（包络线）。
import { svgOpen, svgClose, line, circle, path, niceScale, scale, spcAxes, yGrid, xLabels } from '../base.js';
import { uChart } from './spc.js';
import { emitOverlay, makePlot } from './overlays.js';

export function renderU(counts, sizes, theme, opts = {}) {
  const W = opts.w || 880, H = opts.h || 520;
  const r = uChart(counts, sizes);
  const us = r.points.map((p) => p.u);
  const allY = [...us, ...r.points.map((p) => p.ucl), r.ubar];
  const yScale = niceScale(0, Math.max(...allY), 6);
  const m = { top: 64, right: 64, bottom: 64, left: 72 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const L = opts.lang === 'en';
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / counts.length) * pw;
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  let s = svgOpen(W, H, theme);
  s += spcAxes(W, H, theme, { ...opts, subtitle: opts.subtitle || (L ? `ū=${r.ubar.toFixed(3)}` : `ū=${r.ubar.toFixed(3)}`) }).s;
  if (major) s += yGrid(m, pw, ph, yScale, theme);

  // 控制限包络 + 均值线
  const env = (key) => {
    let d = `M${xOf(0)} ${yOf(r.points[0][key])}`;
    r.points.forEach((p, i) => { if (i > 0) d += ` L${xOf(i)} ${yOf(p[key])}`; });
    return d;
  };
  s += path(env('ucl'), { stroke: theme.accent2, dash: '4 4', sw: 1.2 });
  s += path(env('lcl'), { stroke: theme.accent2, dash: '4 4', sw: 1.2 });
  s += line(m.left, yOf(r.ubar), m.left + pw, yOf(r.ubar), theme, { color: theme.muted, width: 1, dash: '4 4' });

  // 点
  r.points.forEach((p, i) => {
    if (p.flag) s += circle(xOf(i), yOf(p.u), 5, theme.accent2);
    else s += circle(xOf(i), yOf(p.u), 3.5, theme.accent);
  });

  s += xLabels(m, pw, ph, counts.map((_, i) => i + 1), theme);
  const ctx = { m, pw, ph, xOf, yOf, xType: 'category', yType: 'linear', xMin: 0, xMax: counts.length - 1, yMin: yScale.min, yMax: yScale.max, xStep: 1, yStep: yScale.step };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
