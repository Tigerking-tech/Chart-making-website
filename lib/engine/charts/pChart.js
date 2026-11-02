// p 控制图（不良率）：逐点限制随样本量变化。
import { svgOpen, svgClose, text } from '../base.js';
import { pChart } from './spc.js';
import { controlPanel } from './controlLayout.js';

export function renderP(defectives, sizes, theme, opts = {}) {
  const W = opts.w || 860, H = opts.h || 520;
  const r = pChart(defectives, sizes);
  const vals = r.points.map((p) => p.p);
  const yMax = Math.max(...vals, ...r.points.map((p) => p.ucl)) * 1.05;
  const yMin = 0;

  const L = opts.lang === 'en';
  let s = svgOpen(W, H, theme);
  if (opts.showTitle !== false) {
    s += text(64, 36, opts.title || (L ? 'p Control Chart (defect rate)' : 'p 控制图（不良率）'), theme, { size: 20, weight: '700' });
    s += text(64, 54, `p̄=${r.pbar.toFixed(4)}`, theme, { size: 12, color: theme.muted });
  }
  s += controlPanel(W, H, theme, {
    yMin, yMax, nPoints: r.points.length, cl: r.pbar, ucl: Math.max(...r.points.map((p) => p.ucl)), lcl: 0,
    points: r.points.map((p) => ({ v: p.p, flag: p.flag })),
    xLabels: r.points.map((_, i) => 'G' + (i + 1)),
  });
  s += svgClose();
  return s;
}
