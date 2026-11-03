// ===========================================================================
// paperfigs.js — 论文级图表（原创实现）
// 全部由 ChartForge 自研 SVG 引擎从零绘制，复用 base / overlays / stats 原语，
// 不依赖任何第三方绘图库，也不复制任何外部脚本。
// 覆盖论文高频但旧引擎缺失的多序列图型：
//   · renderGroupedBar  分组 / 堆叠柱状图（多序列分类对比）
//   · renderErrorLine   多序列折线图（含对称误差棒，对标论文 error bar）
//   · renderBoxplot     箱线图（Tukey 1.5·IQR 须线 + 离群点）
// ===========================================================================

import { svgOpen, svgClose, text, line, rect, circle, niceScale, scale, esc } from '../base.js';
import { emitOverlay, makePlot, drawErrorBars } from './overlays.js';
import { quantile } from '../stats/stats.js';

// 多序列分类色板：序列 0/1 走主题 accent/accent2，其余用固定区分色。
const EXTRA = ['#1f9d55', '#9b59b6', '#e74c3c', '#16a2b8', '#e0a800', '#5b6770'];
export function seriesColor(theme, i) {
  if (i === 0) return theme.accent;
  if (i === 1) return theme.accent2;
  return EXTRA[(i - 2) % EXTRA.length];
}

// ---------------------------------------------------------------------------
// 分组柱状图
//   data: { categories: string[], series: [{ name, values: number[] }] }
//   opts: { stacked?, legend?, dataLabels?, references?, gridlines? }
// ---------------------------------------------------------------------------
export function renderGroupedBar(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const dataLabels = opts.dataLabels !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const cats = data.categories || [];
  const series = data.series || [];
  const nC = cats.length, nS = series.length;

  let yMax = 0;
  series.forEach((s) => s.values.forEach((v) => { if (v > yMax) yMax = v; }));
  const yScale = niceScale(0, yMax, 6);

  const baseM = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const useLegend = nS > 1 && opts.legend !== 'none';
  const m = useLegend ? { ...baseM, right: baseM.right + 136 } : baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Grouped Bar' : '分组柱状图'), theme, { size: 20, weight: '700' });

  // 主网格 + Y 刻度
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  });

  const slot = pw / Math.max(1, nC);
  const groupW = slot * 0.72;
  const xCenter = (i) => m.left + slot * (i + 0.5);

  if (nS <= 1) {
    // 退化为单序列柱状
    const vals = (series[0] && series[0].values) || [];
    const bw = groupW;
    for (let i = 0; i < nC; i++) {
      const v = vals[i] || 0;
      const yTop = yOf(v), yBot = yOf(0);
      s += rect(xCenter(i) - bw / 2, yTop, bw, yBot - yTop, theme, { fill: seriesColor(theme, 0), rx: 2 });
      if (dataLabels) s += text(xCenter(i), yTop - 6, String(v), theme, { size: 10, color: theme.ink, anchor: 'middle', weight: '600' });
      s += text(xCenter(i), m.top + ph + 20, esc(cats[i]), theme, { size: 11, color: theme.muted, anchor: 'middle' });
    }
  } else {
    const bw = (groupW / nS) * 0.84;
    const gap = (groupW / nS) * 0.16;
    for (let i = 0; i < nC; i++) {
      const gx = xCenter(i) - groupW / 2;
      for (let j = 0; j < nS; j++) {
        const v = series[j].values[i] || 0;
        const yTop = yOf(v), yBot = yOf(0);
        const x = gx + j * (bw + gap) + gap / 2;
        s += rect(x, yTop, bw, yBot - yTop, theme, { fill: seriesColor(theme, j), rx: 2 });
        if (dataLabels) s += text(x + bw / 2, yTop - 6, String(v), theme, { size: 9, color: theme.ink, anchor: 'middle', weight: '600' });
      }
      s += text(xCenter(i), m.top + ph + 20, esc(cats[i]), theme, { size: 11, color: theme.muted, anchor: 'middle' });
    }
  }

  // 坐标轴
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

  // 图例（右栏）
  if (useLegend) {
    series.forEach((se, i) => {
      const y0 = m.top + 12 + i * 26;
      s += rect(m.left + pw + 16, y0, 14, 14, theme, { fill: seriesColor(theme, i), rx: 2 });
      s += text(m.left + pw + 38, y0 + 11, se.name, theme, { size: 12, color: theme.ink });
    });
  }

  const ctx = {
    m, pw, ph, xOf: xCenter, yOf,
    xType: 'category', yType: 'linear',
    xMin: 0, xMax: Math.max(0, nC - 1), yMin: yScale.min, yMax: yScale.max,
    xStep: 1, yStep: yScale.step,
    series: series.map((se, i) => ({ name: se.name, color: seriesColor(theme, i), shape: 'rect' })),
  };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}

// ---------------------------------------------------------------------------
// 多序列误差折线图
//   data: { xType:'linear'|'category', xs:(number|string)[],
//           series:[{ name, values:number[], errors:number[] }] }
//   opts: { legend?, references?, gridlines? }
// ---------------------------------------------------------------------------
export function renderErrorLine(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const xType = data.xType === 'linear' ? 'linear' : 'category';
  const xs = data.xs || [];
  const series = data.series || [];
  const n = xs.length;

  let yMin = Infinity, yMax = -Infinity;
  series.forEach((se) => se.values.forEach((v, i) => {
    const e = se.errors[i] || 0;
    if (v - e < yMin) yMin = v - e;
    if (v + e > yMax) yMax = v + e;
  }));
  if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
  const yScale = niceScale(yMin, yMax, 6);

  const baseM = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const useLegend = series.length > 1 && opts.legend !== 'none';
  const m = useLegend ? { ...baseM, right: baseM.right + 136 } : baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Line Chart' : '误差折线图'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  });

  let xOf, xMin, xMax, xStep;
  if (xType === 'linear') {
    const xNums = xs.map(Number);
    const xScale = niceScale(Math.min(...xNums), Math.max(...xNums), 6);
    xOf = scale(xScale.min, xScale.max, m.left, m.left + pw);
    xMin = xScale.min; xMax = xScale.max; xStep = xScale.step;
    if (major) xScale.ticks.forEach((t) => {
      s += text(xOf(t), m.top + ph + 20, String(t), theme, { size: 10, color: theme.gridText, anchor: 'middle' });
    });
  } else {
    const slot = pw / Math.max(1, n);
    xOf = (i) => m.left + slot * (i + 0.5);
    xMin = 0; xMax = Math.max(0, n - 1); xStep = 1;
    xs.forEach((lab, i) => s += text(xOf(i), m.top + ph + 20, String(lab), theme, { size: 10, color: theme.gridText, anchor: 'middle' }));
  }

  // 数据折线 + 点 + 误差棒
  const xAt = (i) => (xType === 'linear' ? xOf(Number(xs[i])) : xOf(i));
  series.forEach((se, si) => {
    const color = seriesColor(theme, si);
    let d = '';
    se.values.forEach((v, i) => { d += (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yOf(v) + ' '; });
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    const eb = [];
    se.values.forEach((v, i) => {
      s += circle(xAt(i), yOf(v), 3.5, color);
      const e = se.errors[i] || 0;
      if (e > 0) eb.push({ x: xType === 'linear' ? Number(xs[i]) : i, y: v, ymin: v - e, ymax: v + e });
    });
    if (eb.length) s += drawErrorBars({ m, pw, xOf, yOf }, eb, theme);
  });

  // 坐标轴
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

  if (useLegend) {
    series.forEach((se, i) => {
      const y0 = m.top + 12 + i * 26;
      s += line(m.left + pw + 16, y0 + 7, m.left + pw + 36, y0 + 7, theme, { color: seriesColor(theme, i), width: 2.5 });
      s += text(m.left + pw + 42, y0 + 11, se.name, theme, { size: 12, color: theme.ink });
    });
  }

  const ctx = {
    m, pw, ph, xOf, yOf,
    xType, yType: 'linear',
    xMin, xMax, yMin: yScale.min, yMax: yScale.max, xStep, yStep: yScale.step,
    series: series.map((se, i) => ({ name: se.name, color: seriesColor(theme, i), shape: 'line' })),
  };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}

// ---------------------------------------------------------------------------
// 箱线图（Tukey 须线法）
//   data: { groups: [{ name, values: number[] }] }
//   opts: { legend?, references?, gridlines? }
//   箱体 = Q1–Q3，中线 = 中位数，须线 = 1.5·IQR 内最值，圆点 = 离群值，实心点 = 均值
// ---------------------------------------------------------------------------
export function renderBoxplot(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const groups = data.groups || [];
  const n = groups.length;

  const stats = groups.map((g) => {
    const vals = [...g.values].sort((a, b) => a - b);
    const q1 = quantile(vals, 0.25), med = quantile(vals, 0.5), q3 = quantile(vals, 0.75);
    const iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const inliers = vals.filter((v) => v >= loF && v <= hiF);
    const wlo = inliers.length ? Math.min(...inliers) : Math.min(...vals);
    const whi = inliers.length ? Math.max(...inliers) : Math.max(...vals);
    const outliers = vals.filter((v) => v < loF || v > hiF);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { q1, med, q3, wlo, whi, outliers, mean };
  });

  let yMin = Math.min(...stats.map((s) => s.wlo), ...stats.flatMap((s) => s.outliers));
  let yMax = Math.max(...stats.map((s) => s.whi), ...stats.flatMap((s) => s.outliers));
  if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
  const yScale = niceScale(yMin, yMax, 6);

  const m = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Box Plot' : '箱线图'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  });

  const slot = pw / Math.max(1, n);
  const boxW = Math.min(slot * 0.5, 84);
  const xCenter = (i) => m.left + slot * (i + 0.5);

  groups.forEach((g, i) => {
    const st = stats[i];
    const cx = xCenter(i);
    const yQ1 = yOf(st.q1), yQ3 = yOf(st.q3), yMed = yOf(st.med);
    const yWlo = yOf(st.wlo), yWhi = yOf(st.whi);
    // 须线
    s += line(cx, yWhi, cx, yQ3, theme, { color: theme.ink, width: 1.5 });
    s += line(cx, yQ1, cx, yWlo, theme, { color: theme.ink, width: 1.5 });
    s += line(cx - 10, yWhi, cx + 10, yWhi, theme, { color: theme.ink, width: 1.5 });
    s += line(cx - 10, yWlo, cx + 10, yWlo, theme, { color: theme.ink, width: 1.5 });
    // 箱体
    s += rect(cx - boxW / 2, yQ3, boxW, yQ1 - yQ3, theme, { fill: theme.accent, opacity: 0.16, stroke: theme.ink, sw: 1.5 });
    // 中位数
    s += line(cx - boxW / 2, yMed, cx + boxW / 2, yMed, theme, { color: theme.accent2, width: 2.5 });
    // 均值
    s += circle(cx, yOf(st.mean), 3.2, theme.accent2);
    // 离群点
    st.outliers.forEach((o) => { s += circle(cx, yOf(o), 3, theme.muted, { stroke: theme.ink, sw: 1 }); });
    // x 标签
    s += text(cx, m.top + ph + 20, esc(g.name), theme, { size: 11, color: theme.muted, anchor: 'middle' });
  });

  // 坐标轴
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

  // 图例说明（底部一行）
  if (major) {
    const note = L
      ? 'box = IQR   ─ median   ● mean   ○ outlier'
      : '箱体 = IQR   ─ 中位数   ● 均值   ○ 离群值';
    s += text(m.left, m.top + ph + 44, note, theme, { size: 11, color: theme.muted });
  }

  const ctx = {
    m, pw, ph, xOf: xCenter, yOf,
    xType: 'category', yType: 'linear',
    xMin: 0, xMax: Math.max(0, n - 1), yMin: yScale.min, yMax: yScale.max,
    xStep: 1, yStep: yScale.step,
  };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
