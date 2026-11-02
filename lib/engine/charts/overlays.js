// ===========================================================================
// overlays.js — 图表叠加层（对标竞品的「可开关 / 可拖动」线元素）
// 统一覆盖：参考线 / 参考带、趋势线 + 置信区间带、误差线、四分位带、次网格。
// 设计原则：
//   · 纯函数：输入 ctx（绘图区 + 比例尺）+ opts，输出 SVG 片段；
//   · 引擎内调用 → 保证 PNG/PPTX 导出同样包含这些元素（导出安全）；
//   · React 叠加层（ReferenceLayer）只负责「拖动把手」与交互开关，
//     几何位置由 plot 元数据 + 数据域推导，与引擎渲染像素级一致。
// ctx 约定：{ m, pw, ph, xOf(v), yOf(v), xType:'linear'|'category'|'time',
//             yType:'linear', xMin, xMax, yMin, yMax, xStep, yStep, series }
// ===========================================================================

import { line, rect, text, circle, path } from '../base.js';

/** 生成 plot 元数据（供 React 叠加层定位）。 */
export function makePlot(ctx) {
  const { m, pw, ph } = ctx;
  return {
    x: m.left, y: m.top, w: pw, h: ph,
    xMin: ctx.xMin, xMax: ctx.xMax, yMin: ctx.yMin, yMax: ctx.yMax,
    xType: ctx.xType || 'linear', yType: ctx.yType || 'linear',
    series: ctx.series || null,
    aux: ctx.aux || null,
  };
}

// ---------------------------------------------------------------------------
// 次网格（major 之外细分，默认隐藏，可由 opts.gridlines.minor 开启）
// ---------------------------------------------------------------------------
function minorTicks(min, max, step) {
  const arr = [];
  if (!step) return arr;
  const half = step / 4;
  for (let v = min; v <= max + 1e-9; v += step) {
    for (let k = 1; k < 4; k++) {
      const t = v + k * half;
      if (t > max - 1e-9) break;
      arr.push(+t.toFixed(10));
    }
  }
  return arr;
}

/** 由渲染器在画完主网格后调用，按需追加次网格。 */
export function minorGrid(ctx, theme, opts = {}) {
  const on = opts.gridlines && opts.gridlines.minor;
  if (!on) return '';
  let s = '';
  if (ctx.yStep) {
    const ticks = minorTicks(ctx.yMin, ctx.yMax, ctx.yStep);
    ticks.forEach((t) => {
      if (t <= ctx.yMin + 1e-9 || t >= ctx.yMax - 1e-9) return;
      const y = ctx.yOf(t);
      s += line(ctx.m.left, y, ctx.m.left + ctx.pw, y, theme, { color: theme.grid, width: 0.5, opacity: 0.5 });
    });
  }
  if (ctx.xStep && ctx.xType !== 'category') {
    const ticks = minorTicks(ctx.xMin, ctx.xMax, ctx.xStep);
    ticks.forEach((t) => {
      if (t <= ctx.xMin + 1e-9 || t >= ctx.xMax - 1e-9) return;
      const x = ctx.xOf(t);
      s += line(x, ctx.m.top, x, ctx.m.top + ctx.ph, theme, { color: theme.grid, width: 0.5, opacity: 0.5 });
    });
  }
  return s;
}

// ---------------------------------------------------------------------------
// 参考线 / 参考带（对标 Datawrapper / Tableau 的 Reference Line / Band）
//  refs: [{ id, axis:'x'|'y', value, value2?, label, color, dashed, width,
//           opacity, fill, show }]
//   axis='y' → 水平线（或带，需 value2）；axis='x' → 垂直线（或带）
// ---------------------------------------------------------------------------
export function drawReferences(ctx, refs, theme) {
  if (!refs || !refs.length) return '';
  let s = '';
  const plot = { left: ctx.m.left, right: ctx.m.left + ctx.pw, top: ctx.m.top, bottom: ctx.m.top + ctx.ph };
  refs.forEach((r) => {
    if (r.show === false) return;
    const color = r.color || theme.accent2;
    const width = r.width || 1.5;
    const dash = r.dashed ? '6 4' : '';
    if (r.axis === 'y') {
      const y = ctx.yOf(r.value);
      const y2 = r.value2 != null ? ctx.yOf(r.value2) : null;
      if (y2 != null) {
        const top = Math.min(y, y2), hgt = Math.abs(y2 - y);
        s += rect(plot.left, top, ctx.pw, hgt, theme, { fill: color, opacity: r.opacity != null ? r.opacity : 0.12, stroke: 'none' });
      } else {
        s += line(plot.left, y, plot.right, y, theme, { color, width, dash });
      }
      if (r.label) {
        const ly = y2 != null ? (Math.min(y, y2) + Math.abs(y2 - y) / 2) : y;
        s += text(plot.right - 6, ly - 5, r.label, theme, { size: 11, color, anchor: 'end', weight: '600' });
      }
    } else {
      if (ctx.xType === 'category') return; // 分类轴不支持垂直参考线
      const x = ctx.xOf(r.value);
      if (r.value2 != null) {
        const x2 = ctx.xOf(r.value2);
        const left = Math.min(x, x2), wdt = Math.abs(x2 - x);
        s += rect(left, plot.top, wdt, ctx.ph, theme, { fill: color, opacity: r.opacity != null ? r.opacity : 0.12, stroke: 'none' });
      } else {
        s += line(x, plot.top, x, plot.bottom, theme, { color, width, dash });
      }
      if (r.label) {
        const lx = r.value2 != null ? (Math.min(x, x2) + Math.abs(x2 - x) / 2) : x;
        s += text(lx, plot.top + 14, r.label, theme, { size: 11, color, anchor: 'middle', weight: '600' });
      }
    }
  });
  return s;
}

// ---------------------------------------------------------------------------
// 趋势线 + 置信区间带（对标 Excel / Tableau 趋势线）
//   type: 'linear'（默认）| 'poly2'（二次）
//  返回 { pts:[{x,y}], ci:[[lo,hi],...], eq, r2 }
// ---------------------------------------------------------------------------
export function trendLine(xs, ys, type = 'linear') {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  if (type === 'poly2') {
    // 二次多项式最小二乘
    let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
    for (let i = 0; i < n; i++) {
      const x = xs[i], y = ys[i];
      s0 += 1; s1 += x; s2 += x * x; s3 += x * x * x; s4 += x * x * x * x;
      t0 += y; t1 += x * y; t2 += x * x * y;
    }
    // 解 [s0 s1 s2; s1 s2 s3; s2 s3 s4][c0 c1 c2]^T = [t0 t1 t2]
    const det = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s2 * s3) + s2 * (s1 * s3 - s2 * s2);
    if (Math.abs(det) < 1e-9) return trendLine(xs, ys, 'linear');
    const a0 = (t0 * (s2 * s4 - s3 * s3) - s1 * (t1 * s4 - t2 * s3) + s2 * (t1 * s3 - t2 * s2)) / det;
    const a1 = (s0 * (t1 * s4 - t2 * s3) - t0 * (s1 * s4 - s2 * s3) + s2 * (s1 * t2 - t1 * s2)) / det;
    const a2 = (s0 * (s2 * t2 - t1 * s3) - s1 * (s1 * t2 - t1 * s2) + t0 * (s1 * s3 - s2 * s2)) / det;
    const pts = xs.map((x) => ({ x, y: a0 + a1 * x + a2 * x * x }));
    return { pts, ci: pts.map((p) => [p.y, p.y]), eq: `y = ${a2.toFixed(3)}x² + ${a1.toFixed(3)}x + ${a0.toFixed(3)}`, r2: 0 };
  }
  // 线性
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  const predict = (x) => slope * x + intercept;
  // 残差标准误 → 95% 置信区间带（逐点）
  let sse = 0;
  for (let i = 0; i < n; i++) { const e = ys[i] - predict(xs[i]); sse += e * e; }
  const sigma = Math.sqrt(sse / Math.max(1, n - 2));
  const t95 = 1.96;
  const xRange = Math.max(...xs) - Math.min(...xs) || 1;
  const ci = xs.map((x) => {
    const se = sigma * Math.sqrt(1 / n + ((x - mx) ** 2) / (sxx || 1));
    const d = t95 * se;
    const y = predict(x);
    return [y - d, y + d];
  });
  const pts = xs.map((x) => ({ x, y: predict(x) }));
  return { pts, ci, eq: `y = ${slope.toFixed(3)}x ${intercept >= 0 ? '+' : '−'} ${Math.abs(intercept).toFixed(3)}`, r2: r * r };
}

/** 画趋势线 + 可选置信带；pts 需按 x 升序。 */
export function drawTrend(ctx, trend, theme, opts = {}) {
  if (!trend || !trend.pts || trend.pts.length < 2) return '';
  let s = '';
  const color = opts.color || theme.accent2;
  // 置信带（先画，置于线下方）
  if (opts.ci && trend.ci) {
    let dUp = '', dLo = '';
    trend.pts.forEach((p, i) => {
      const x = ctx.xOf(p.x), up = ctx.yOf(trend.ci[i][1]), lo = ctx.yOf(trend.ci[i][0]);
      dUp += (i === 0 ? 'M' : 'L') + x + ' ' + up + ' ';
      dLo = (i === 0 ? 'M' : 'L') + x + ' ' + lo + ' ' + dLo;
    });
    s += `<path d="${dUp + dLo} Z" fill="${color}" opacity="0.12"/>`;
  }
  let d = '';
  trend.pts.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + ctx.xOf(p.x) + ' ' + ctx.yOf(p.y) + ' '; });
  s += path(d, { stroke: color, width: opts.width || 2.5, dash: opts.dashed ? '6 4' : '' });
  return s;
}

// ---------------------------------------------------------------------------
// 误差线（对标 Excel / Tableau Error Bars）
//   errs: [{ x, y, ymin, ymax, xmin?, xmax? }]（数据坐标）
// ---------------------------------------------------------------------------
export function drawErrorBars(ctx, errs, theme) {
  if (!errs || !errs.length) return '';
  let s = '';
  const c = theme.muted;
  errs.forEach((e) => {
    const cx = ctx.xOf(e.x), cy = ctx.yOf(e.y);
    if (e.ymin != null && e.ymax != null) {
      const y1 = ctx.yOf(e.ymax), y2 = ctx.yOf(e.ymin);
      s += line(cx, y1, cx, y2, theme, { color: c, width: 1 });
      s += line(cx - 4, y1, cx + 4, y1, theme, { color: c, width: 1 });
      s += line(cx - 4, y2, cx + 4, y2, theme, { color: c, width: 1 });
    }
    if (e.xmin != null && e.xmax != null) {
      const x1 = ctx.xOf(e.xmax), x2 = ctx.xOf(e.xmin);
      s += line(x1, cy, x2, cy, theme, { color: c, width: 1 });
      s += line(x1, cy - 4, x1, cy + 4, theme, { color: c, width: 1 });
      s += line(x2, cy - 4, x2, cy + 4, theme, { color: c, width: 1 });
    }
  });
  return s;
}

// ---------------------------------------------------------------------------
// 四分位带（对标箱线/中位数+四分位区间；此处画一条水平带）
//   q: { yMin, yMed, yMax }（数据坐标，y 轴）
// ---------------------------------------------------------------------------
export function drawQuartileBand(ctx, q, theme) {
  if (!q) return '';
  const top = ctx.yOf(q.yMax), bot = ctx.yOf(q.yMin), med = ctx.yOf(q.yMed);
  let s = '';
  s += rect(ctx.m.left, top, ctx.pw, Math.abs(bot - top), theme, { fill: theme.accent, opacity: 0.12, stroke: 'none' });
  s += line(ctx.m.left, med, ctx.m.left + ctx.pw, med, theme, { color: theme.accent, width: 1.5, dash: '4 3' });
  return s;
}

// ---------------------------------------------------------------------------
// 统一出口：渲染器在画完数据后调用，追加次网格 + 参考线/带。
// （趋势线/误差线/四分位带由渲染器按需显式调用 drawTrend/drawErrorBars/drawQuartileBand）
// ---------------------------------------------------------------------------
export function emitOverlay(ctx, opts, theme) {
  let s = '';
  s += minorGrid(ctx, theme, opts);
  s += drawReferences(ctx, opts.references || [], theme);
  return s;
}
