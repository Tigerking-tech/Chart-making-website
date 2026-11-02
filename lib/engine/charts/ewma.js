// EWMA 控制图（指数加权移动平均）：对微小漂移比 I-MR 更敏感。
import { svgOpen, svgClose, text, line, circle, path, niceScale, scale, esc, spcAxes, yGrid, xLabels, drawLegend, legendLayout } from '../base.js';
import { ewma } from './spc.js';

export function renderEwma(values, theme, opts = {}) {
  const W = opts.w || 880, H = opts.h || 520;
  const r = ewma(values, opts.lambda ?? 0.2, opts.L ?? 3);
  const allY = [...r.z, ...r.ucl, ...r.lcl, r.target];
  const yScale = niceScale(Math.min(...allY), Math.max(...allY), 6);
  const { m, pos } = legendLayout({ top: 64, right: 64, bottom: 64, left: 72 }, opts);
  if (pos === 'right') m.right += 120; else if (pos === 'bottom') m.bottom += 50;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const L = opts.lang === 'en';
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / values.length) * pw;
  const sub = (L ? `λ=${r.lambda} · L=${r.L} · CL=${r.target.toFixed(3)}` : `λ=${r.lambda} · L=${r.L} · CL=${r.target.toFixed(3)}`);
  let s = svgOpen(W, H, theme);
  const ax = spcAxes(W, H, theme, { ...opts, subtitle: opts.subtitle || sub });
  s += ax.s;
  s += yGrid(m, pw, ph, yScale, theme);

  // 控制限包络 + 中心线
  const env = (arr) => {
    let d = `M${xOf(0)} ${yOf(arr[0])}`;
    arr.forEach((v, i) => { if (i > 0) d += ` L${xOf(i)} ${yOf(v)}`; });
    return d;
  };
  s += path(env(r.ucl), { stroke: theme.accent2, dash: '4 4', sw: 1.2 });
  s += path(env(r.lcl), { stroke: theme.accent2, dash: '4 4', sw: 1.2 });
  s += line(m.left, yOf(r.target), m.left + pw, yOf(r.target), theme, { color: theme.muted, width: 1, dash: '4 4' });

  // EWMA 折线
  s += path(env(r.z), { stroke: theme.accent, sw: 2.5 });
  values.forEach((_, i) => {
    if (r.flags[i]) s += circle(xOf(i), yOf(r.z[i]), 4.5, theme.accent2);
    else s += circle(xOf(i), yOf(r.z[i]), 3, theme.accent);
  });

  s += xLabels(m, pw, ph, values.map((_, i) => i + 1), theme);
  if (pos !== 'none') {
    const items = [
      { label: L ? 'EWMA' : 'EWMA 值', color: theme.accent, shape: 'line' },
      { label: L ? 'Control Limits' : '控制限', color: theme.accent2, shape: 'line' },
    ];
    s += drawLegend(items, theme, pos, pos === 'right' ? { x: m.left + pw + 16, y: m.top + 18 } : { x: m.left, y: m.top + ph + 34, w: pw });
  }
  s += svgClose();
  return s;
}
