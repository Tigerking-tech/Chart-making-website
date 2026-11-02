// 直方图 Histogram：频数柱 + 正态曲线叠加 + 可选规格上下限
import { svgOpen, svgClose, text, line, rect, niceScale, scale, path, esc } from '../base.js';
import { histogram, mean, std, normalPdf } from '../stats/stats.js';

export function renderHistogram(values, theme, opts = {}) {
  const W = opts.w || 860, H = opts.h || 520;
  const m = { top: 72, right: 72, bottom: 72, left: 64 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const h = histogram(values, opts.bins);
  const mu = mean(values), sigma = std(values, true);
  // 规格限并入横轴量程，避免 USL/LSL 画出绘图区外
  const domLo = Math.min(h.lo, opts.lsl != null ? opts.lsl : h.lo);
  const domHi = Math.max(h.hi, opts.usl != null ? opts.usl : h.hi);
  const yMax = Math.max(...h.counts);
  const yScale = niceScale(0, yMax, 6);
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const xOf = (v) => m.left + ((v - domLo) / (domHi - domLo || 1)) * pw;

  let s = svgOpen(W, H, theme);
  s += text(m.left, 38, opts.title || '直方图 Histogram', theme, { size: 20, weight: '700' });
  const cap = `μ=${mu.toFixed(2)}  σ=${sigma.toFixed(2)}`;
  s += text(m.left, 56, opts.subtitle || cap, theme, { size: 12, color: theme.muted });

  yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 10, y + 4, String(t), theme, { size: 11, color: theme.gridText, anchor: 'end' });
  });

  // 柱
  h.counts.forEach((c, i) => {
    const x = xOf(h.edges[i]);
    const w = (h.width / (h.hi - h.lo || 1)) * pw;
    const y = yOf(c);
    s += rect(x, y, w - 2, m.top + ph - y, theme, { fill: theme.accent, rx: 1, opacity: 0.85 });
  });

  // 正态曲线（按频数缩放）
  let d = '';
  const steps = 60;
  for (let k = 0; k <= steps; k++) {
    const v = h.lo + (k / steps) * (h.hi - h.lo);
    const pdf = normalPdf(v, mu, sigma);
    const freqPeak = pdf * values.length * h.width;
    const x = xOf(v), y = yOf(freqPeak);
    d += (k === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
  }
  s += path(d, { stroke: theme.accent2, sw: 2.5 });

  // 规格限
  if (opts.usl != null) {
    const x = xOf(opts.usl);
    s += line(x, m.top, x, m.top + ph, theme, { color: theme.ink, width: 1.5, dash: '4 3' });
    s += text(x, m.top - 8, 'USL', theme, { size: 11, color: theme.ink, anchor: 'middle' });
  }
  if (opts.lsl != null) {
    const x = xOf(opts.lsl);
    s += line(x, m.top, x, m.top + ph, theme, { color: theme.ink, width: 1.5, dash: '4 3' });
    s += text(x, m.top - 8, 'LSL', theme, { size: 11, color: theme.ink, anchor: 'middle' });
  }

  // 轴标签
  s += text(m.left + pw / 2, H - 24, opts.xLabel || '数值', theme, { size: 12, color: theme.muted, anchor: 'middle' });
  s += `</svg>`;
  return s;
}
