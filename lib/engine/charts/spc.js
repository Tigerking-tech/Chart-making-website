// ===========================================================================
// spc.js — SPC 统计核心（控制图常数 + 算法）
// 参考开源实现 NovaSPC / QCSPCChart 的口径：subgroup size 2..10 的标准常数表，
// X̄-R / p / c 控制图控制限、过程能力 Cp/Cpk。这是与"纯美化工具"拉开差距的壁垒。
// ===========================================================================
import { mean, std, quantile } from '../stats/stats.js';

// n -> [d2, d3, A2, A3, D3, D4, B3, B4, c4]
const T = {
  2: [1.128, 0.853, 1.880, 2.659, 0, 3.267, 0, 3.267, 0.7979],
  3: [1.693, 0.888, 1.023, 1.954, 0, 2.574, 0, 2.568, 0.8862],
  4: [2.059, 0.880, 0.729, 1.628, 0, 2.282, 0, 2.266, 0.9213],
  5: [2.326, 0.864, 0.577, 1.427, 0, 2.114, 0, 2.089, 0.9400],
  6: [2.534, 0.848, 0.483, 1.287, 0, 2.004, 0.030, 1.970, 0.9515],
  7: [2.704, 0.833, 0.419, 1.182, 0.076, 1.924, 0.118, 1.882, 0.9594],
  8: [2.847, 0.820, 0.373, 1.099, 0.136, 1.864, 0.185, 1.815, 0.9650],
  9: [2.970, 0.808, 0.337, 1.032, 0.184, 1.816, 0.239, 1.761, 0.9693],
  10: [3.078, 0.797, 0.308, 0.975, 0.223, 1.777, 0.284, 1.716, 0.9727],
};

export function spcConst(n) {
  const k = Math.max(2, Math.min(10, Math.round(n)));
  const a = T[k];
  return { d2: a[0], d3: a[1], A2: a[2], A3: a[3], D3: a[4], D4: a[5], B3: a[6], B4: a[7], c4: a[8], n: k };
}

/** 默认子组大小：取 √N 并夹在 2..10。 */
export function defaultSubgroup(n) {
  return Math.max(2, Math.min(10, Math.round(Math.sqrt(n))));
}

/** X̄-R 控制图：X̄ 图（均值）+ R 图（极差）。 */
export function xbarR(all, subgroupSize = 0) {
  const n = subgroupSize || defaultSubgroup(all.length);
  const groups = [];
  for (let i = 0; i < all.length; i += n) groups.push(all.slice(i, i + n));
  const xbars = groups.map((g) => mean(g));
  const Rs = groups.map((g) => Math.max(...g) - Math.min(...g));
  const Xdbl = mean(xbars);
  const Rbar = mean(Rs);
  const c = spcConst(n);
  const xcl = Xdbl, xucl = Xdbl + c.A2 * Rbar, xlcl = Xdbl - c.A2 * Rbar;
  const rcl = Rbar, rucl = c.D4 * Rbar, rlcl = c.D3 * Rbar;
  return { n, groups, xbars, Rs, Xdbl, Rbar, xcl, xucl, xlcl, rcl, rucl, rlcl, c };
}

/** p 控制图（不良率）：缺陷数 d_i 与样本量 n_i，限制随样本量变化。 */
export function pChart(defectives, sizes) {
  const totalD = defectives.reduce((a, b) => a + b, 0);
  const totalN = sizes.reduce((a, b) => a + b, 0);
  const pbar = totalD / totalN;
  const points = defectives.map((d, i) => {
    const p = d / sizes[i];
    const se = Math.sqrt((pbar * (1 - pbar)) / sizes[i]);
    const ucl = pbar + 3 * se;
    const lcl = Math.max(0, pbar - 3 * se);
    return { p, ucl, lcl, flag: p > ucl || p < lcl };
  });
  return { pbar, points };
}

/** c 控制图（缺陷数）：泊松计数。 */
export function cChart(counts) {
  const cbar = mean(counts);
  const ucl = cbar + 3 * Math.sqrt(cbar);
  const lcl = Math.max(0, cbar - 3 * Math.sqrt(cbar));
  const points = counts.map((c) => ({ c, ucl, lcl, flag: c > ucl || c < lcl }));
  return { cbar, ucl, lcl, points };
}

/** 过程能力指数（需规格上下限），含 Cp/Cpk 与判定。 */
export function capability(values, usl, lsl) {
  const m = mean(values);
  const s = std(values, true);
  const cp = usl != null && lsl != null ? (usl - lsl) / (6 * s) : null;
  const cpu = usl != null ? (usl - m) / (3 * s) : null;
  const cpl = lsl != null ? (m - lsl) / (3 * s) : null;
  const cpk = cpu != null && cpl != null ? Math.min(cpu, cpl) : cpu != null ? cpu : cpl;
  let verdict;
  if (cpk == null) verdict = '需提供双边规格限';
  else if (cpk >= 1.67) verdict = '过程能力优秀 (Cpk ≥ 1.67)';
  else if (cpk >= 1.33) verdict = '过程能力充足 (Cpk ≥ 1.33)';
  else if (cpk >= 1.0) verdict = '过程能力边缘 (1.0 ≤ Cpk < 1.33)';
  else verdict = '过程能力不足 (Cpk < 1.0)';
  return { mean: m, sigma: s, cp, cpu, cpl, cpk, verdict };
}

/** 把越界点标记出来（Western Electric R1：超出 3σ 控制限）。 */
export function flagLimits(values, ucl, lcl) {
  return values.map((v) => v > ucl || v < lcl);
}

// ===========================================================================
// 扩展 SPC 图族：EWMA / CUSUM / Run / NP / U —— 补齐 Minitab / SigmaDesk 的基本盘
// ===========================================================================

/** EWMA 控制图（指数加权移动平均）。lambda 默认 0.2，L 默认 3（σ 倍数）。 */
export function ewma(values, lambda = 0.2, L = 3) {
  const n = values.length;
  const target = mean(values);
  const sigma = std(values, true);
  const z = [target];
  for (let i = 1; i < n; i++) z.push(lambda * values[i] + (1 - lambda) * z[i - 1]);
  // 时变控制限（精确公式）
  const seAt = (i) => L * sigma * Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
  const ucl = z.map((_, i) => target + seAt(i));
  const lcl = z.map((_, i) => target - seAt(i));
  const flags = z.map((v, i) => v > ucl[i] || v < lcl[i]);
  return { target, sigma, lambda, L, z, ucl, lcl, flags };
}

/** CUSUM 控制图（累积和，双侧）。k=参考值(默认 0.5σ)，H=决策区间(默认 5σ)。 */
export function cusum(values, k = null, H = null) {
  const n = values.length;
  const target = mean(values);
  const sigma = std(values, true);
  const kk = k != null ? k : 0.5 * sigma;
  const HH = H != null ? H : 5 * sigma;
  let cp = 0, cm = 0;
  const cu = [], cl = [];
  for (let i = 0; i < n; i++) {
    cp = Math.max(0, cp + (values[i] - (target + kk)));
    cm = Math.max(0, cm + ((target - kk) - values[i]));
    cu.push(cp); cl.push(cm);
  }
  const flags = cu.map((v, i) => v > HH || cl[i] > HH);
  return { target, sigma, kk, HH, cu, cl, flags };
}

/** Run 图（运行图）：中位数参考线 + 信号规则（漂移≥6 同侧 / 趋势≥5 连升连降）。 */
export function runChart(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const med = quantile(sorted, 0.5);
  const n = values.length;
  const side = values.map((v) => (v > med ? 1 : v < med ? -1 : 0));
  const flags = values.map(() => []);
  let run = 1;
  for (let i = 1; i < n; i++) {
    run = (side[i] !== 0 && side[i] === side[i - 1]) ? run + 1 : 1;
    if (run >= 6) flags[i].push('Shift');
  }
  let inc = 1, dec = 1;
  for (let i = 1; i < n; i++) {
    if (values[i] > values[i - 1]) { inc++; dec = 1; }
    else if (values[i] < values[i - 1]) { dec++; inc = 1; }
    else { inc = 1; dec = 1; }
    if (inc >= 5) flags[i].push('Trend');
    if (dec >= 5) flags[i].push('Trend');
  }
  return { med, flags };
}

/** NP 控制图（不良数，样本量恒定）。 */
export function npChart(defectives, sizes) {
  const totalD = defectives.reduce((a, b) => a + b, 0);
  const totalN = sizes.reduce((a, b) => a + b, 0);
  const pbar = totalD / totalN;
  const n = mean(sizes);
  const cl = pbar * n;
  const sd = () => Math.sqrt(n * pbar * (1 - pbar));
  const ucl = cl + 3 * sd();
  const lcl = Math.max(0, cl - 3 * sd());
  const points = defectives.map((d, i) => {
    const ni = sizes[i];
    const uclI = pbar * ni + 3 * Math.sqrt(ni * pbar * (1 - pbar));
    const lclI = Math.max(0, pbar * ni - 3 * Math.sqrt(ni * pbar * (1 - pbar)));
    return { d, ucl: uclI, lcl: lclI, flag: d > uclI || d < lclI };
  });
  return { pbar, n, cl, ucl, lcl, points };
}

/** U 控制图（单位缺陷数，样本量可变）。 */
export function uChart(counts, sizes) {
  const totalC = counts.reduce((a, b) => a + b, 0);
  const totalN = sizes.reduce((a, b) => a + b, 0);
  const ubar = totalC / totalN;
  const points = counts.map((c, i) => {
    const ni = sizes[i];
    const u = c / ni;
    const ucl = ubar + 3 * Math.sqrt(ubar / ni);
    const lcl = Math.max(0, ubar - 3 * Math.sqrt(ubar / ni));
    return { u, ucl, lcl, flag: u > ucl || u < lcl };
  });
  return { ubar, points };
}

// ---------------------------------------------------------------------------
// MSA / Gage R&R（量具重复性与再现性，AIAG Xbar-R 法）
// ---------------------------------------------------------------------------
// d2 表：子组大小 2..10（与 spcConst 同一来源）
const D2 = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };

/** 交叉 Gage R&R（Xbar-R 法）。data: {op, part, val}[]。 */
export function gageRR(data) {
  const ops = [...new Set(data.map((d) => d.op))];
  const parts = [...new Set(data.map((d) => d.part))];
  const k = ops.length, n = parts.length;
  // 试验次数（每个 op×part 的重复数，取最常见）
  const reps = {};
  data.forEach((d) => { const key = d.op + '|' + d.part; reps[key] = (reps[key] || 0) + 1; });
  const rvals = Object.values(reps);
  const r = Math.round(mean(rvals));
  // 每个 op×part 的均值与极差
  const cells = {};
  data.forEach((d) => { const key = d.op + '|' + d.part; (cells[key] = cells[key] || []).push(d.val); });
  const ranges = Object.values(cells).map((arr) => Math.max(...arr) - Math.min(...arr));
  const Rbar = mean(ranges);
  const d2r = D2[r] || 1.128;
  // 重复性 EV
  const EV = Rbar / d2r;
  // 操作者均值极差（XbarDiff）
  const opMeans = ops.map((op) => mean(data.filter((d) => d.op === op).map((d) => d.val)));
  const XbarDiff = Math.max(...opMeans) - Math.min(...opMeans);
  const d2k = D2[k] || 1.128; // 操作者数对应的 d2（简化，AIAG 通用）
  const AVraw = Math.sqrt(Math.pow(XbarDiff / d2k, 2) - Math.pow(EV, 2) / (n * r));
  const AV = isNaN(AVraw) || AVraw < 0 ? 0 : AVraw;
  // 零件均值极差
  const partMeans = parts.map((p) => mean(data.filter((d) => d.part === p).map((d) => d.val)));
  const Rp = Math.max(...partMeans) - Math.min(...partMeans);
  const d2n = D2[n] || 1.128;
  const PV = Rp / d2n;
  const GRR = Math.sqrt(EV * EV + AV * AV);
  const TV = Math.sqrt(GRR * GRR + PV * PV);
  const pct = (x) => (TV > 0 ? (100 * x) / TV : 0);
  const ndc = (PV > 0 && GRR > 0) ? 1.41 * (PV / GRR) : 0;
  let cls;
  const grrPct = pct(GRR);
  if (grrPct < 10) cls = { key: 'ok' };
  else if (grrPct <= 30) cls = { key: 'warn' };
  else cls = { key: 'bad' };
  return {
    k, n, r, EV, AV, PV, GRR, TV,
    pctEV: pct(EV), pctAV: pct(AV), pctGRR: grrPct, pctPV: pct(PV),
    ndc, cls,
    opMeans, partMeans, XbarDiff,
  };
}
