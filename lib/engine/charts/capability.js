// 过程能力分析图：直方图 + 正态曲线 + 规格限(USL/LSL) + Cp/Cpk 结论面板。
import { svgOpen, svgClose, text, line, rect, path, circle, legendLayout, drawLegend } from '../base.js';
import { histogram, normalPdf, mean, std, quantile } from '../stats/stats.js';
import { capability } from './spc.js';
import { emitOverlay, makePlot } from './overlays.js';

export function renderCapability(values, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  // 右侧已放置结论面板，图例只支持底部或隐藏，避免与它冲突。
  const legendPos = opts.legend === 'bottom' ? 'bottom' : 'none';
  const W = opts.w || 880, H = opts.h || 560;
  const { m, pos } = legendLayout({ top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 64 }, { legend: legendPos });
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const mu = mean(values), sigma = std(values, true);
  let usl = opts.usl != null ? opts.usl : mu + 4 * sigma;
  let lsl = opts.lsl != null ? opts.lsl : mu - 4 * sigma;

  const h = histogram(values, opts.bins || 0);
  const xMin = Math.min(h.lo, lsl != null ? lsl : h.lo);
  const xMax = Math.max(h.hi, usl != null ? usl : h.hi);
  const xOf = (v) => m.left + ((v - xMin) / ((xMax - xMin) || 1)) * pw;
  const yMax = Math.max(...h.counts) * 1.2;
  const yOf = (c) => m.top + ph - (c / yMax) * ph;

  const cap = capability(values, usl, lsl);
  const N = values.length, bw = h.width;
  const L = opts.lang === 'en';
  const verdictText =
    cap.cpk == null ? (L ? 'Two-sided spec required' : '需提供双边规格限')
    : cap.cpk >= 1.67 ? (L ? 'Excellent capability (Cpk ≥ 1.67)' : '过程能力优秀 (Cpk ≥ 1.67)')
    : cap.cpk >= 1.33 ? (L ? 'Adequate capability (Cpk ≥ 1.33)' : '过程能力充足 (Cpk ≥ 1.33)')
    : cap.cpk >= 1.0 ? (L ? 'Marginal capability (1.0 ≤ Cpk < 1.33)' : '过程能力边缘 (1.0 ≤ Cpk < 1.33)')
    : (L ? 'Inadequate capability (Cpk < 1.0)' : '过程能力不足 (Cpk < 1.0)');

  let s = svgOpen(W, H, theme);
  if (showTitle) {
    s += text(m.left, 38, opts.title || (L ? 'Process Capability Cp/Cpk' : '过程能力分析 Cp/Cpk'), theme, { size: 20, weight: '700' });
    s += text(m.left, 56, verdictText, theme, { size: 13, color: cap.cpk != null && cap.cpk < 1.33 ? theme.accent2 : theme.accent });
  } else {
    s += text(m.left, 30, verdictText, theme, { size: 13, color: cap.cpk != null && cap.cpk < 1.33 ? theme.accent2 : theme.accent });
  }

  // y 网格 + 刻度（受 gridlines.major 开关）
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) for (let i = 0; i <= 5; i++) {
    const y = m.top + (ph * i) / 5;
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(Math.round((yMax * (5 - i)) / 5)), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  }
  // 坐标轴
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });

  // 直方图柱
  h.counts.forEach((c, i) => {
    const x0 = xOf(h.edges[i]), x1 = xOf(h.edges[i + 1]);
    const y0 = m.top + ph, y1 = yOf(c);
    s += rect(x0 + 1, y1, (x1 - x0) - 2, y0 - y1, theme, { fill: theme.accent, stroke: theme.paper, sw: 1, opacity: 0.55 });
  });

  // 正态曲线（期望频数）
  let d = '';
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const v = xMin + ((xMax - xMin) * i) / steps;
    const exp = normalPdf(v, mu, sigma) * N * bw;
    const x = xOf(v), y = yOf(exp);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  s += path(d, { stroke: theme.accent2, sw: 2.5 });

  // 规格限
  if (usl != null) {
    s += line(xOf(usl), m.top, xOf(usl), m.top + ph, theme, { color: theme.accent2, width: 1.5, dash: '6 4' });
    s += text(xOf(usl), m.top - 6, 'USL', theme, { size: 10, color: theme.accent2, anchor: 'middle' });
  }
  if (lsl != null) {
    s += line(xOf(lsl), m.top, xOf(lsl), m.top + ph, theme, { color: theme.accent2, width: 1.5, dash: '6 4' });
    s += text(xOf(lsl), m.top - 6, 'LSL', theme, { size: 10, color: theme.accent2, anchor: 'middle' });
  }

  // 结论面板
  const bx = m.left + pw - 196, by = m.top + 12, boxW = 184, boxH = 132;
  s += rect(bx, by, boxW, boxH, theme, { fill: theme.paper, stroke: theme.ink, sw: 1 });
  const rows = [
    ['Cp', cap.cp != null ? cap.cp.toFixed(2) : '—'],
    ['Cpk', cap.cpk != null ? cap.cpk.toFixed(2) : '—'],
    ['CPU', cap.cpu != null ? cap.cpu.toFixed(2) : '—'],
    ['CPL', cap.cpl != null ? cap.cpl.toFixed(2) : '—'],
    [L ? 'Mean μ' : '均值 μ', mu.toFixed(3)],
    ['σ', sigma.toFixed(3)],
  ];
  rows.forEach((r2, i) => {
    const yy = by + 22 + i * 18;
    s += text(bx + 12, yy, r2[0], theme, { size: 11, color: theme.muted });
    s += text(bx + boxW - 12, yy, r2[1], theme, { size: 11, color: theme.ink, anchor: 'end', weight: '700' });
  });

  // x 轴
  for (let i = 0; i <= 5; i++) {
    const v = xMin + ((xMax - xMin) * i) / 5;
    s += text(xOf(v), m.top + ph + 18, v.toFixed(2), theme, { size: 10, color: theme.gridText, anchor: 'middle' });
  }

  // 四分位带（数据分布：Q1~Q3 竖带 + 中位数线）
  if (opts.quartileBand) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25), q2 = quantile(sorted, 0.5), q3 = quantile(sorted, 0.75);
    s += rect(xOf(q1), m.top, Math.abs(xOf(q3) - xOf(q1)), ph, theme, { fill: theme.accent, opacity: 0.12, stroke: 'none' });
    s += line(xOf(q2), m.top, xOf(q2), m.top + ph, theme, { color: theme.accent, width: 1.5, dash: '4 3' });
  }

  // 图例（频数柱 / 正态曲线）
  const legendItems = [
    { label: L ? 'Histogram' : '频数柱', color: theme.accent, shape: 'rect' },
    { label: L ? 'Normal curve' : '正态曲线', color: theme.accent2, shape: 'line' },
  ];
  if (pos === 'bottom') s += drawLegend(legendItems, theme, 'bottom', { x: m.left, y: m.top + ph + 40, w: pw });

  // 叠加层：次网格 + 参考线/带
  const ctx = { m, pw, ph, xOf, yOf, xType: 'linear', yType: 'linear', xMin, xMax, yMin: 0, yMax, xStep: (xMax - xMin) / 5, yStep: yMax / 5 };
  s += emitOverlay(ctx, opts, theme);

  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
