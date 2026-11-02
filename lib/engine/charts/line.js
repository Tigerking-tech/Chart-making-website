// 折线图 Line：时间序列 / 趋势
import { svgOpen, svgClose, text, line, circle, niceScale, scale } from '../base.js';
import { emitOverlay, makePlot, trendLine, drawTrend, drawQuartileBand } from './overlays.js';
import { quantile } from '../stats/stats.js';

export function renderLine(points, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const m = { top: showTitle ? 72 : 44, right: 72, bottom: 72, left: 72 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xs_ = niceScale(Math.min(...xs), Math.max(...xs), 6);
  const ys_ = niceScale(Math.min(...ys), Math.max(...ys), 6);
  const xOf = scale(xs_.min, xs_.max, m.left, m.left + pw);
  const yOf = scale(ys_.min, ys_.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Line Chart' : '折线图 Line'), theme, { size: 20, weight: '700' });
  if (showTitle && opts.subtitle) s += text(m.left, 56, opts.subtitle, theme, { size: 12, color: theme.muted });

  // 主网格（受 gridlines.major 开关）
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) {
    ys_.ticks.forEach((t) => {
      const y = yOf(t);
      s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
      s += text(m.left - 10, y + 4, String(t), theme, { size: 11, color: theme.gridText, anchor: 'end' });
    });
    xs_.ticks.forEach((t) => {
      const x = xOf(t);
      s += text(x, m.top + ph + 22, String(t), theme, { size: 11, color: theme.gridText, anchor: 'middle' });
    });
  }

  // 四分位带（中位数 + 四分位区间，沿 y 轴）
  if (opts.quartileBand) {
    const sorted = [...ys].sort((a, b) => a - b);
    s += drawQuartileBand({ m, pw, yOf }, { yMin: quantile(sorted, 0.25), yMed: quantile(sorted, 0.5), yMax: quantile(sorted, 0.75) }, theme);
  }

  // 趋势线（可选，含置信区间带）
  if (opts.trend && opts.trend.show) {
    const tr = trendLine(xs, ys, opts.trend.type || 'linear');
    if (tr) s += drawTrend({ m, pw, xOf, yOf, xType: 'linear' }, tr, theme, { ci: opts.trend.ci });
  }

  // 数据折线 + 点
  let d = '';
  points.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + xOf(p.x) + ' ' + yOf(p.y) + ' '; });
  s += `<path d="${d}" fill="none" stroke="${theme.accent}" stroke-width="2.5"/>`;
  points.forEach((p) => { s += circle(xOf(p.x), yOf(p.y), 3.5, theme.accent); });

  // 坐标轴
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });

  // 叠加层：次网格 + 参考线/带（可拖动、可开关）
  const ctx = { m, pw, ph, xOf, yOf, xType: 'linear', yType: 'linear', xMin: xs_.min, xMax: xs_.max, yMin: ys_.min, yMax: ys_.max, xStep: xs_.step, yStep: ys_.step };
  s += emitOverlay(ctx, opts, theme);

  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
