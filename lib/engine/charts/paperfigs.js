// ===========================================================================
// paperfigs.js — 论文级图表（原创实现）
// 全部由 ChartForge 自研 SVG 引擎从零绘制，复用 base / overlays / stats 原语，
// 不依赖任何第三方绘图库，也不复制任何外部脚本。
// 覆盖论文高频但旧引擎缺失的图型：
//   · renderGroupedBar  分组柱状图（多序列分类对比）
//   · renderErrorLine   多序列折线图（含对称误差棒，对标论文 error bar）
//   · renderBoxplot     箱线图（Tukey 1.5·IQR 须线 + 离群点）
//   · renderStackedBar  堆叠柱状图（成分构成对比）
//   · renderViolin      小提琴图（KDE 密度 + 内嵌中位数箱体）
//   · renderECDF        经验累积分布函数（阶梯图）
//   · renderBubble      气泡图（面积编码第三维）
//   · renderDensity2D   二维密度图（二维直方图 + 色条）
// ===========================================================================

import { svgOpen, svgClose, text, line, rect, circle, niceScale, scale, esc } from '../base.js';
import { emitOverlay, makePlot, drawErrorBars } from './overlays.js';
import { quantile, std } from '../stats/stats.js';

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

// ===========================================================================
// 高斯核密度估计（用于小提琴图）
// ===========================================================================
function kde(values, grid, bandwidth) {
  const n = values.length;
  const inv = 1 / (n * bandwidth * Math.sqrt(2 * Math.PI));
  return grid.map((x) => {
    let sum = 0;
    for (const v of values) {
      const u = (x - v) / bandwidth;
      sum += Math.exp(-0.5 * u * u);
    }
    return inv * sum;
  });
}

// ---------------------------------------------------------------------------
// 堆叠柱状图（成分构成，多序列累计堆叠）
//   data: { categories: string[], series: [{ name, values: number[] }] }
// ---------------------------------------------------------------------------
export function renderStackedBar(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const dataLabels = opts.dataLabels !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const cats = data.categories || [];
  const series = data.series || [];
  const nC = cats.length, nS = series.length;

  let yMax = 0;
  for (let i = 0; i < nC; i++) {
    let sum = 0;
    series.forEach((se) => { sum += (se.values[i] || 0); });
    if (sum > yMax) yMax = sum;
  }
  const yScale = niceScale(0, yMax, 6);

  const baseM = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const useLegend = nS > 1 && opts.legend !== 'none';
  const m = useLegend ? { ...baseM, right: baseM.right + 136 } : baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Stacked Bar' : '堆叠柱状图'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  });

  const slot = pw / Math.max(1, nC);
  const barW = Math.min(slot * 0.6, 90);
  const xCenter = (i) => m.left + slot * (i + 0.5);

  for (let i = 0; i < nC; i++) {
    const cx = xCenter(i);
    let acc = 0;
    for (let j = 0; j < nS; j++) {
      const v = series[j].values[i] || 0;
      const yTop = yOf(acc + v), yBot = yOf(acc);
      s += rect(cx - barW / 2, yTop, barW, yBot - yTop, theme, { fill: seriesColor(theme, j), rx: 1 });
      if (dataLabels && v !== 0) s += text(cx, yTop - 6, String(v), theme, { size: 9, color: theme.ink, anchor: 'middle', weight: '600' });
      acc += v;
    }
    s += text(cx, m.top + ph + 20, esc(cats[i]), theme, { size: 11, color: theme.muted, anchor: 'middle' });
  }

  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

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
// 小提琴图（KDE 密度 + 内嵌中位数箱体）
//   data: { groups: [{ name, values: number[] }] }
// ---------------------------------------------------------------------------
export function renderViolin(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const groups = data.groups || [];
  const n = groups.length;
  const G = 44;

  const comps = groups.map((g) => {
    const vals = [...g.values].sort((a, b) => a - b);
    const q1 = quantile(vals, 0.25), med = quantile(vals, 0.5), q3 = quantile(vals, 0.75);
    const iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const inl = vals.filter((v) => v >= loF && v <= hiF);
    const wlo = inl.length ? Math.min(...inl) : Math.min(...vals);
    const whi = inl.length ? Math.max(...inl) : Math.max(...vals);
    const outl = vals.filter((v) => v < loF || v > hiF);
    const sd = std(vals, true) || 1;
    const bw = 1.06 * sd * Math.pow(vals.length, -1 / 5) || 1;
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.08 || 1;
    const grid = [];
    for (let k = 0; k <= G; k++) grid.push(lo - pad + (k / G) * ((hi - lo) + 2 * pad));
    const dens = kde(vals, grid, bw);
    return { vals, q1, med, q3, wlo, whi, outl, dens, grid };
  });

  let yMin = Math.min(...comps.map((c) => c.wlo), ...comps.flatMap((c) => c.outl));
  let yMax = Math.max(...comps.map((c) => c.whi), ...comps.flatMap((c) => c.outl));
  if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
  const yScale = niceScale(yMin, yMax, 6);

  const baseM = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const m = baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Violin Plot' : '小提琴图'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) yScale.ticks.forEach((t) => {
    const y = yOf(t);
    s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  });

  const slot = pw / Math.max(1, n);
  const maxHalf = Math.min(slot * 0.4, 64);
  const maxDens = Math.max(...comps.map((c) => Math.max(...c.dens))) || 1;
  const scaleF = maxHalf / maxDens;
  const xCenter = (i) => m.left + slot * (i + 0.5);

  groups.forEach((g, i) => {
    const c = comps[i];
    const x0 = xCenter(i);
    let d = '';
    for (let k = 0; k <= G; k++) { const x = x0 - c.dens[k] * scaleF; d += (k === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + yOf(c.grid[k]).toFixed(2) + ' '; }
    for (let k = G; k >= 0; k--) { const x = x0 + c.dens[k] * scaleF; d += 'L' + x.toFixed(2) + ' ' + yOf(c.grid[k]).toFixed(2) + ' '; }
    d += 'Z';
    s += `<path d="${d}" fill="${theme.accent}" opacity="0.18" stroke="${theme.ink}" stroke-width="1.2"/>`;
    s += line(x0, yOf(c.whi), x0, yOf(c.wlo), theme, { color: theme.muted, width: 1 });
    const yQ1 = yOf(c.q1), yQ3 = yOf(c.q3), yMed = yOf(c.med);
    const bw = Math.min(maxHalf * 0.2, 14);
    s += rect(x0 - bw / 2, yQ3, bw, yQ1 - yQ3, theme, { fill: theme.accent2, opacity: 0.9, stroke: 'none' });
    s += line(x0 - bw / 2, yMed, x0 + bw / 2, yMed, theme, { color: theme.ink, width: 2 });
    c.outl.forEach((o) => s += circle(x0, yOf(o), 2.4, theme.muted));
    s += text(x0, m.top + ph + 20, esc(g.name), theme, { size: 11, color: theme.muted, anchor: 'middle' });
  });

  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

  if (major) {
    const note = L
      ? 'violin = density   ▮ median box   ○ outlier'
      : '小提琴 = 密度   ▮ 中位数箱体   ○ 离群值';
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

// ---------------------------------------------------------------------------
// 经验累积分布函数（ECDF 阶梯图）
//   data: { series: [{ name, values: number[] }] }
// ---------------------------------------------------------------------------
export function renderECDF(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const series = data.series || [];
  const nS = series.length;

  let xMin = Infinity, xMax = -Infinity;
  series.forEach((se) => se.values.forEach((v) => { if (v < xMin) xMin = v; if (v > xMax) xMax = v; }));
  if (!isFinite(xMin)) { xMin = 0; xMax = 1; }
  const xScale = niceScale(xMin, xMax, 6);
  const yScale = niceScale(0, 1, 5);

  const baseM = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const useLegend = nS > 1 && opts.legend !== 'none';
  const m = useLegend ? { ...baseM, right: baseM.right + 136 } : baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const xOf = scale(xScale.min, xScale.max, m.left, m.left + pw);
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'ECDF' : '经验累积分布'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) {
    yScale.ticks.forEach((t) => {
      const y = yOf(t);
      s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
      s += text(m.left - 8, y + 4, Math.round(t * 100) + '%', theme, { size: 10, color: theme.gridText, anchor: 'end' });
    });
    xScale.ticks.forEach((t) => s += text(xOf(t), m.top + ph + 20, String(t), theme, { size: 10, color: theme.gridText, anchor: 'middle' }));
  }

  series.forEach((se, si) => {
    const color = seriesColor(theme, si);
    const sorted = [...se.values].sort((a, b) => a - b);
    const N = sorted.length;
    let d = `M ${xOf(xScale.min).toFixed(2)} ${yOf(0).toFixed(2)} `;
    for (let i = 0; i < N; i++) {
      const x = sorted[i];
      const yPrev = i === 0 ? 0 : i / N;
      const yCur = (i + 1) / N;
      d += `L ${xOf(x).toFixed(2)} ${yOf(yPrev).toFixed(2)} `;
      d += `L ${xOf(x).toFixed(2)} ${yOf(yCur).toFixed(2)} `;
    }
    d += `L ${xOf(xScale.max).toFixed(2)} ${yOf(1).toFixed(2)} `;
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    sorted.forEach((x, i) => s += circle(xOf(x), yOf((i + 1) / N), 2.5, color));
  });

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
    xType: 'linear', yType: 'linear',
    xMin: xScale.min, xMax: xScale.max, yMin: yScale.min, yMax: yScale.max, xStep: xScale.step, yStep: yScale.step,
    series: series.map((se, i) => ({ name: se.name, color: seriesColor(theme, i), shape: 'line' })),
  };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}

// ---------------------------------------------------------------------------
// 气泡图（面积编码第三维）
//   data: { points: [{ x, y, size, g? }], groups: [{ name }] }
// ---------------------------------------------------------------------------
export function renderBubble(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const points = data.points || [];
  const groups = data.groups || [];
  const hasGroup = groups.length > 0;

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, sMin = Infinity, sMax = -Infinity;
  points.forEach((p) => {
    if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
    if (p.size < sMin) sMin = p.size; if (p.size > sMax) sMax = p.size;
  });
  if (!isFinite(xMin)) { xMin = 0; xMax = 1; yMin = 0; yMax = 1; sMin = 0; sMax = 1; }
  if (sMax === sMin) sMax = sMin + 1;
  const xScale = niceScale(xMin, xMax, 6);
  const yScale = niceScale(yMin, yMax, 6);

  const baseM = { top: showTitle ? 72 : 44, right: 64, bottom: 72, left: 72 };
  const useLegend = hasGroup && opts.legend !== 'none';
  const m = useLegend ? { ...baseM, right: baseM.right + 136 } : baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const xOf = scale(xScale.min, xScale.max, m.left, m.left + pw);
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? 'Bubble Chart' : '气泡图'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) {
    yScale.ticks.forEach((t) => {
      const y = yOf(t);
      s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
      s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
    });
    xScale.ticks.forEach((t) => s += text(xOf(t), m.top + ph + 20, String(t), theme, { size: 10, color: theme.gridText, anchor: 'middle' }));
  }

  const rMax = 34, rMin = 4;
  points.forEach((p) => {
    const gi = p.g ?? 0;
    const color = hasGroup ? seriesColor(theme, gi) : theme.accent;
    const r = rMin + Math.sqrt((p.size - sMin) / (sMax - sMin)) * (rMax - rMin);
    s += `<circle cx="${xOf(p.x).toFixed(2)}" cy="${yOf(p.y).toFixed(2)}" r="${r.toFixed(1)}" fill="${color}" opacity="0.5" stroke="${color}" stroke-width="1.2"/>`;
  });

  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

  if (useLegend) {
    groups.forEach((g, i) => {
      const y0 = m.top + 12 + i * 26;
      s += circle(m.left + pw + 23, y0 + 7, 6, seriesColor(theme, i));
      s += text(m.left + pw + 38, y0 + 11, g.name, theme, { size: 12, color: theme.ink });
    });
  }

  const ctx = {
    m, pw, ph, xOf, yOf,
    xType: 'linear', yType: 'linear',
    xMin: xScale.min, xMax: xScale.max, yMin: yScale.min, yMax: yScale.max, xStep: xScale.step, yStep: yScale.step,
    series: groups.map((g, i) => ({ name: g.name, color: seriesColor(theme, i), shape: 'circle' })),
  };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}

// ---------------------------------------------------------------------------
// 二维密度图（二维直方图 + 色条）
//   data: { xs: number[], ys: number[] }
// ---------------------------------------------------------------------------
export function renderDensity2D(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const W = opts.w || 860, H = opts.h || 520;
  const xs = data.xs || [], ys = data.ys || [];
  const N = Math.min(xs.length, ys.length);

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = xs[i], y = ys[i];
    if (x < xMin) xMin = x; if (x > xMax) xMax = x;
    if (y < yMin) yMin = y; if (y > yMax) yMax = y;
  }
  if (!isFinite(xMin)) { xMin = 0; xMax = 1; yMin = 0; yMax = 1; }
  const xScale = niceScale(xMin, xMax, 6);
  const yScale = niceScale(yMin, yMax, 6);
  const GX = 12, GY = 12;
  const xw = (xScale.max - xScale.min) / GX, yw = (yScale.max - yScale.min) / GY;
  const cnt = Array.from({ length: GY }, () => new Array(GX).fill(0));
  let cmax = 0;
  for (let i = 0; i < N; i++) {
    let gx = Math.floor((xs[i] - xScale.min) / xw);
    let gy = Math.floor((ys[i] - yScale.min) / yw);
    if (gx < 0) gx = 0; if (gx >= GX) gx = GX - 1;
    if (gy < 0) gy = 0; if (gy >= GY) gy = GY - 1;
    cnt[gy][gx]++; if (cnt[gy][gx] > cmax) cmax = cnt[gy][gx];
  }
  if (cmax === 0) cmax = 1;

  const baseM = { top: showTitle ? 72 : 44, right: 96, bottom: 72, left: 72 };
  const m = baseM;
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const xOf = scale(xScale.min, xScale.max, m.left, m.left + pw);
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const cw = pw / GX, ch = ph / GY;

  const ac = [parseInt(theme.accent.slice(1, 3), 16), parseInt(theme.accent.slice(3, 5), 16), parseInt(theme.accent.slice(5, 7), 16)];
  const colAt = (t) => {
    const r = Math.round(255 + (ac[0] - 255) * t);
    const g = Math.round(255 + (ac[1] - 255) * t);
    const b = Math.round(255 + (ac[2] - 255) * t);
    return `rgb(${r},${g},${b})`;
  };

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (showTitle) s += text(m.left, 38, opts.title || (L ? '2D Density' : '二维密度图'), theme, { size: 20, weight: '700' });

  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  if (major) {
    yScale.ticks.forEach((t) => s += text(m.left - 8, yOf(t) + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' }));
    xScale.ticks.forEach((t) => s += text(xOf(t), m.top + ph + 20, String(t), theme, { size: 10, color: theme.gridText, anchor: 'middle' }));
  }

  for (let gy = 0; gy < GY; gy++) {
    for (let gx = 0; gx < GX; gx++) {
      const c = cnt[gy][gx];
      if (c === 0) continue;
      const t = c / cmax;
      const x = m.left + gx * cw, y = m.top + gy * ch;
      s += rect(x, y, cw + 0.5, ch + 0.5, theme, { fill: colAt(Math.pow(t, 0.7)), stroke: theme.grid, sw: 0.5 });
    }
  }

  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });

  const cbX = m.left + pw + 24, cbY = m.top, cbH = ph, cbW = 14, STEPS = 24;
  for (let k = 0; k < STEPS; k++) {
    const t = k / (STEPS - 1);
    const y = cbY + cbH - ((k + 1) / STEPS) * cbH;
    s += rect(cbX, y, cbW, cbH / STEPS + 0.6, theme, { fill: colAt(Math.pow(t, 0.7)), stroke: 'none' });
  }
  s += line(cbX, cbY, cbX, cbY + cbH, theme, { color: theme.ink, width: 1 });
  s += line(cbX + cbW, cbY, cbX + cbW, cbY + cbH, theme, { color: theme.ink, width: 1 });
  s += text(cbX + cbW + 4, cbY + 4, String(cmax), theme, { size: 9, color: theme.muted });
  s += text(cbX + cbW + 4, cbY + cbH, String(0), theme, { size: 9, color: theme.muted });
  s += text(cbX + cbW / 2, cbY - 10, 'count', theme, { size: 9, color: theme.muted, anchor: 'middle' });

  const ctx = {
    m, pw, ph, xOf, yOf,
    xType: 'linear', yType: 'linear',
    xMin: xScale.min, xMax: xScale.max, yMin: yScale.min, yMax: yScale.max, xStep: xScale.step, yStep: yScale.step,
  };
  s += emitOverlay(ctx, opts, theme);
  s += svgClose();
  return { svg: s, plot: makePlot(ctx) };
}
