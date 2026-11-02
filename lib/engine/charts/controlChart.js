// 控制图 Control Chart（I-MR 单值图）：中心线 + 3σ 控制限 + 异常点高亮
import { svgOpen, svgClose, text, line, circle, niceScale, scale } from '../base.js';
import { iMR } from '../stats/stats.js';
import { emitOverlay, makePlot } from './overlays.js';

export function renderControl(values, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const m = { top: showTitle ? 72 : 44, right: 72, bottom: 72, left: 72 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const cc = iMR(values);
  const lo = Math.min(...values, cc.lcl);
  const hi = Math.max(...values, cc.ucl);
  const ys_ = niceScale(lo, hi, 6);
  const yOf = scale(ys_.min, ys_.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / values.length) * pw;

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  const sub = opts.subtitle || `CL=${cc.cl.toFixed(2)}  UCL=${cc.ucl.toFixed(2)}  LCL=${cc.lcl.toFixed(2)}`;
  if (showTitle) {
    s += text(m.left, 38, opts.title || (L ? 'I-MR Control Chart' : '控制图 I-MR'), theme, { size: 20, weight: '700' });
    s += text(m.left, 56, sub, theme, { size: 12, color: theme.muted });
  } else {
    s += text(m.left, 30, sub, theme, { size: 12, color: theme.muted });
  }

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) ys_.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 10, y + 4, String(t), theme, { size: 11, color: theme.gridText, anchor: 'end' });
  });

  // 控制限（虚线）
  s += line(m.left, yOf(cc.ucl), m.left + pw, yOf(cc.ucl), theme, { color: theme.accent2, width: 1.5, dash: '6 4' });
  s += text(m.left + pw - 4, yOf(cc.ucl) - 6, 'UCL', theme, { size: 10, color: theme.accent2, anchor: 'end' });
  s += line(m.left, yOf(cc.lcl), m.left + pw, yOf(cc.lcl), theme, { color: theme.accent2, width: 1.5, dash: '6 4' });
  s += text(m.left + pw - 4, yOf(cc.lcl) + 14, 'LCL', theme, { size: 10, color: theme.accent2, anchor: 'end' });
  s += line(m.left, yOf(cc.cl), m.left + pw, yOf(cc.cl), theme, { color: theme.ink, width: 1.5, dash: '2 3' });
  s += text(m.left + 4, yOf(cc.cl) - 6, 'CL', theme, { size: 10, color: theme.ink, anchor: 'start' });

  // 连线 + 点
  let d = '';
  values.forEach((v, i) => { d += (i === 0 ? 'M' : 'L') + xOf(i) + ' ' + yOf(v) + ' '; });
  s += `<path d="${d}" fill="none" stroke="${theme.muted}" stroke-width="1.5"/>`;
  values.forEach((v, i) => {
    const bad = cc.flags[i].length > 0;
    s += circle(xOf(i), yOf(v), bad ? 6 : 4, bad ? theme.accent2 : theme.accent, { stroke: theme.paper, sw: 1 });
    if (bad) s += text(xOf(i), yOf(v) - 12, cc.flags[i].join(','), theme, { size: 9, color: theme.accent2, anchor: 'middle' });
  });

  // 序号轴
  const step = Math.max(1, Math.floor(values.length / 8));
  for (let i = 0; i < values.length; i += step) {
    s += text(xOf(i), m.top + ph + 20, String(i + 1), theme, { size: 10, color: theme.gridText, anchor: 'middle' });
  }
  // 叠加层：次网格 + 参考线/带
  const ctx = { m, pw, ph, xOf, yOf, xType: 'category', yType: 'linear', xMin: 0, xMax: values.length - 1, yMin: ys_.min, yMax: ys_.max, xStep: 1, yStep: ys_.step };
  s += emitOverlay(ctx, opts, theme);

  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
