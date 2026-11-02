// 散布图 Scatter：散点 + 线性/二次趋势线 + 回归方程/相关系数注释框
import { svgOpen, svgClose, text, line, circle, niceScale, scale, rect, esc, legendLayout, drawLegend } from '../base.js';
import { linearRegression, correlationStrength } from '../stats/stats.js';
import { emitOverlay, makePlot, trendLine, drawTrend, drawErrorBars, drawQuartileBand } from './overlays.js';
import { quantile } from '../stats/stats.js';

export function renderScatter(xs, ys, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const { m, pos } = legendLayout({ top: showTitle ? 72 : 44, right: 72, bottom: 72, left: 72 }, opts);
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;

  const reg = linearRegression(xs, ys);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xs_ = niceScale(xMin, xMax, 6);
  const ys_ = niceScale(yMin, yMax, 6);
  const xOf = scale(xs_.min, xs_.max, m.left, m.left + pw);
  const yOf = scale(ys_.min, ys_.max, m.top + ph, m.top);

  const L = opts.lang === 'en';
  const hidden = opts.hiddenSeries || [];
  const showData = !hidden.includes(L ? 'Data points' : '数据点');
  const showTrend = !hidden.includes(L ? 'Trend line' : '趋势线');
  const trendShow = opts.trend ? !!opts.trend.show : true; // 默认显示（保持既有行为）

  let s = svgOpen(W, H, theme);
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Scatter Plot' : '散布图 Scatter'), theme, { size: 20, weight: '700' });
  if (showTitle && opts.subtitle) s += text(m.left, 56, opts.subtitle, theme, { size: 12, color: theme.muted });

  // 网格 + 轴刻度
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) {
    ys_.ticks.forEach((t) => {
      const y = yOf(t);
      s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
      s += text(m.left - 10, y + 4, String(t), theme, { size: 11, color: theme.gridText, anchor: 'end' });
    });
    xs_.ticks.forEach((t) => {
      const x = xOf(t);
      s += line(x, m.top, x, m.top + ph, theme, { color: theme.grid, width: 1 });
      s += text(x, m.top + ph + 22, String(t), theme, { size: 11, color: theme.gridText, anchor: 'middle' });
    });
  }

  // 四分位带
  if (opts.quartileBand) {
    const sx = [...xs].sort((a, b) => a - b), sy = [...ys].sort((a, b) => a - b);
    s += drawQuartileBand({ m, pw, yOf }, { yMin: quantile(sy, 0.25), yMed: quantile(sy, 0.5), yMax: quantile(sy, 0.75) }, theme);
  }

  // 趋势线（覆盖 x 全量程，可开关 + 置信带）
  if (trendShow && showTrend) {
    const tr = trendLine(xs, ys, opts.trend?.type || 'linear');
    if (tr) s += drawTrend({ m, pw, xOf, yOf, xType: 'linear' }, tr, theme, { ci: opts.trend?.ci });
  }

  // 散点
  if (showData) xs.forEach((x, i) => { s += circle(xOf(x), yOf(ys[i]), 5, theme.accent, { stroke: theme.paper, sw: 1 }); });

  // 误差线（opts.errs: [{x,y,ymin,ymax}]）
  if (opts.errorBars && opts.errs) s += drawErrorBars({ m, pw, xOf, yOf }, opts.errs, theme);

  // 轴标题
  s += text(m.left + pw / 2, H - 24, opts.xLabel || (L ? 'X (independent)' : 'X（自变量）'), theme, { size: 12, color: theme.muted, anchor: 'middle' });
  s += text(20, m.top + ph / 2, opts.yLabel || (L ? 'Y (dependent)' : 'Y（因变量）'), theme, { size: 12, color: theme.muted, anchor: 'middle', rotate: -90 });

  // 注释框（回归结论）
  const STRENGTH_EN = { '强相关': 'strong', '中等相关': 'moderate', '弱相关': 'weak', '基本无关': 'negligible' };
  const strength = correlationStrength(reg.r);
  const strengthText = L ? (STRENGTH_EN[strength] || strength) : strength;
  const bx = m.left + 16, by = m.top + 16, bw = 250, bh = 86;
  s += rect(bx, by, bw, bh, theme, { fill: theme.paper, stroke: theme.accent, sw: 1, rx: 4 });
  s += text(bx + 12, by + 22, L ? 'Regression' : '回归方程', theme, { size: 11, color: theme.muted });
  s += text(bx + 12, by + 42, `y = ${reg.slope.toFixed(3)}x ${reg.intercept >= 0 ? '+' : '−'} ${Math.abs(reg.intercept).toFixed(3)}`, theme, { size: 13, weight: '700', color: theme.ink });
  s += text(bx + 12, by + 64, `r = ${reg.r.toFixed(3)}   R² = ${reg.r2.toFixed(3)}`, theme, { size: 12, color: theme.accent2, weight: '600' });
  s += text(bx + 12, by + 80, L ? `Verdict: ${strengthText}` : `结论：${strengthText}`, theme, { size: 11, color: theme.muted });

  // 图例（数据点 / 趋势线）
  const legendItems = [
    { label: L ? 'Data points' : '数据点', color: theme.accent, shape: 'circle' },
    { label: L ? 'Trend line' : '趋势线', color: theme.accent2, shape: 'line' },
  ];
  if (pos === 'right') s += drawLegend(legendItems, theme, 'right', { x: m.left + pw + 14, y: m.top + 14 });
  else if (pos === 'bottom') s += drawLegend(legendItems, theme, 'bottom', { x: m.left, y: m.top + ph + 40, w: pw });

  // 叠加层：次网格 + 参考线/带
  const ctx = { m, pw, ph, xOf, yOf, xType: 'linear', yType: 'linear', xMin: xs_.min, xMax: xs_.max, yMin: ys_.min, yMax: ys_.max, xStep: xs_.step, yStep: ys_.step };
  s += emitOverlay(ctx, opts, theme);

  s += svgClose();
  const plot = makePlot(ctx);
  plot.series = legendItems.filter((it) => (it.label === (L ? 'Data points' : '数据点') ? showData : showTrend));
  return { svg: s, plot };
}
