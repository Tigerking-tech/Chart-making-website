// ===========================================================================
// stats.js — 统计引擎（这是与"纯美化工具"拉开差距的核心壁垒）
// 覆盖：描述统计、线性回归/相关系数、I-MR 控制图、Western Electric 判异、
//       过程能力 Cp/Cpk、直方图分箱。
// ===========================================================================

export function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
export function variance(a, sample = true) {
  const m = mean(a);
  const s = a.reduce((x, y) => x + (y - m) ** 2, 0);
  return s / (a.length - (sample ? 1 : 0));
}
export function std(a, sample = true) { return Math.sqrt(variance(a, sample)); }
export function min(a) { return Math.min(...a); }
export function max(a) { return Math.max(...a); }
export function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

/** 线性回归 + Pearson 相关系数。 */
export function linearRegression(xs, ys) {
  const n = xs.length;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return { slope, intercept, r, r2: r * r, predict: (x) => slope * x + intercept };
}

export function correlation(xs, ys) { return linearRegression(xs, ys).r; }

/** 相关性强度判读（QC 常用标准）。 */
export function correlationStrength(r) {
  const a = Math.abs(r);
  if (a >= 0.8) return '强相关';
  if (a >= 0.5) return '中等相关';
  if (a >= 0.3) return '弱相关';
  return '基本无关';
}

/**
 * I-MR 控制图（单值 + 移动极差）。
 * 返回中心线 CL、上下控制限 UCL/LCL、移动极差值、以及逐点 Western Electric 判异标记。
 */
export function iMR(values) {
  const n = values.length;
  const cl = mean(values);
  const sigma = std(values, true);
  const ucl = cl + 3 * sigma;
  const lcl = cl - 3 * sigma;
  const mr = [0];
  for (let i = 1; i < n; i++) mr.push(Math.abs(values[i] - values[i - 1]));
  const meanMR = mean(mr.slice(1));
  const uclMR = 3.267 * meanMR;
  const clMR = meanMR;

  const flags = values.map(() => []);
  // R1: 超出 3σ
  values.forEach((v, i) => { if (v > ucl || v < lcl) flags[i].push('R1'); });
  // R2: 连续 3 点中有 2 点超出 2σ（同侧）
  const beyond2 = (v) => (v > cl + 2 * sigma ? 1 : v < cl - 2 * sigma ? -1 : 0);
  for (let i = 2; i < n; i++) {
    const seg = [beyond2(values[i]), beyond2(values[i - 1]), beyond2(values[i - 2])];
    const pos = seg.filter((x) => x === 1).length;
    const neg = seg.filter((x) => x === -1).length;
    if (pos >= 2 || neg >= 2) flags[i].push('R2');
  }
  // R3: 连续 5 点中有 4 点超出 1σ（同侧）
  const beyond1 = (v) => (v > cl + sigma ? 1 : v < cl - sigma ? -1 : 0);
  for (let i = 4; i < n; i++) {
    const seg = [beyond1(values[i]), beyond1(values[i - 1]), beyond1(values[i - 2]), beyond1(values[i - 3]), beyond1(values[i - 4])];
    const pos = seg.filter((x) => x === 1).length;
    const neg = seg.filter((x) => x === -1).length;
    if (pos >= 4 || neg >= 4) flags[i].push('R3');
  }
  // R4: 连续 8 点落在中心线同侧
  for (let i = 7; i < n; i++) {
    const seg = values.slice(i - 7, i + 1);
    const above = seg.every((v) => v > cl);
    const below = seg.every((v) => v < cl);
    if (above || below) flags[i].push('R4');
  }

  return { cl, ucl, lcl, sigma, mr, meanMR, uclMR, clMR, flags };
}

/** 过程能力指数（需规格上下限）。 */
export function capability(values, usl, lsl) {
  const m = mean(values);
  const s = std(values, true);
  const cp = (usl != null && lsl != null) ? (usl - lsl) / (6 * s) : null;
  const cpu = usl != null ? (usl - m) / (3 * s) : null;
  const cpl = lsl != null ? (m - lsl) / (3 * s) : null;
  const cpk = (cpu != null && cpl != null) ? Math.min(cpu, cpl) : (cpu != null ? cpu : cpl);
  return { mean: m, sigma: s, cp, cpu, cpl, cpk };
}

/** 直方图分箱（默认 sqrt 法）。 */
export function histogram(values, bins = 0) {
  const lo = min(values), hi = max(values);
  const n = bins || Math.ceil(Math.sqrt(values.length)) || 1;
  const width = (hi - lo) / n || 1;
  const edges = [];
  for (let i = 0; i <= n; i++) edges.push(lo + i * width);
  const counts = new Array(n).fill(0);
  values.forEach((v) => {
    let idx = Math.floor((v - lo) / width);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });
  return { edges, counts, width, n, lo, hi };
}

/** 标准正态概率密度（用于直方图正态曲线叠加）。 */
export function normalPdf(x, mu, sigma) {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}
