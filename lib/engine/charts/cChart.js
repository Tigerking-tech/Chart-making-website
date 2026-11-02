// c 控制图（缺陷数）：泊松计数，恒定控制限。
import { svgOpen, svgClose, text } from '../base.js';
import { cChart } from './spc.js';
import { controlPanel } from './controlLayout.js';
import { makePlot } from './overlays.js';

export function renderC(counts, theme, opts = {}) {
  const W = opts.w || 860, H = opts.h || 520;
  const r = cChart(counts);
  const yMax = Math.max(...r.points.map((p) => p.c), r.ucl) * 1.08;
  const yMin = 0;

  const L = opts.lang === 'en';
  let s = svgOpen(W, H, theme);
  if (opts.showTitle !== false) {
    s += text(64, 36, opts.title || (L ? 'c Control Chart (defect count)' : 'c 控制图（缺陷数）'), theme, { size: 20, weight: '700' });
    s += text(64, 54, `c̄=${r.cbar.toFixed(2)}  UCL=${r.ucl.toFixed(2)}  LCL=${r.lcl.toFixed(2)}`, theme, { size: 12, color: theme.muted });
  }
  const panel = controlPanel(W, H, theme, {
    yMin, yMax, nPoints: r.points.length, cl: r.cbar, ucl: r.ucl, lcl: r.lcl,
    points: r.points.map((p) => ({ v: p.c, flag: p.flag })),
    xLabels: r.points.map((_, i) => String(i + 1)),
    gridlines: opts.gridlines, references: opts.references,
  });
  s += panel.s;
  s += svgClose();
  return { svg: s, plot: makePlot(panel.ctx) };
}
