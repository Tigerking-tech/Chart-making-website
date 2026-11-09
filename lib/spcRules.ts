// lib/spcRules.ts — 控制图判异准则（纯计算，客户端/服务端通用，无 DOM 依赖）
// 口径与项目引擎 renderControl / iMR 完全一致：CL = 均值，σ = 样本标准差，
// UCL/LCL = CL ± 3σ。这样「判定器」的结论与页面上同时渲染的 I-MR 图严格对齐。
//
// 覆盖两套准则：
//   · Western Electric (WECO) 4 条基本规则
//   · Nelson 8 条规则
// 每条规则返回：是否触发、命中点索引(0-based)、命中点序号(1-based)、失效窗口描述。

export interface RuleHit {
  id: string;
  zh: string;
  en: string;
  desc: string;
  descEn: string;
  triggered: boolean;
  hits: number[];        // 0-based 索引
  points: number[];      // 1-based 序号
}

export interface SpcRuleReport {
  values: number[];
  center: number;
  sigma: number;
  ucl: number;
  lcl: number;
  zones: {
    upper3: number; upper2: number; upper1: number;
    lower1: number; lower2: number; lower3: number;
  };
  westernElectric: RuleHit[];
  nelson: RuleHit[];
  flagged: number[];     // 所有被任一规则命中的点（去重，0-based）
}

function mean(a: number[]) { return a.reduce((x, y) => x + y, 0) / a.length; }
function std(a: number[]) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

/** 侧别：+1 / -1 / 0（恰在中心线上视为中性）。 */
function side(v: number, c: number) { return v > c ? 1 : v < c ? -1 : 0; }

/** 是否落在「同侧、超过 kσ」的区域。 */
function beyond(v: number, c: number, s: number, k: number, sgn: number) {
  return sgn > 0 ? v > c + k * s : v < c - k * s;
}

/**
 * 通用「窗口计数」规则：连续 w 个点中，至少 m 个点满足 predicate（同侧）。
 * 返回所有满足的窗口所涉及的异常点索引（去重）。
 */
function windowRule(
  values: number[], w: number, m: number,
  pred: (v: number) => number, // 返回点的侧别(+1/-1)若满足，否则 0
  needSameSide = true,
): number[] {
  const hits = new Set<number>();
  for (let i = w - 1; i < values.length; i++) {
    const win = values.slice(i - w + 1, i + 1);
    const sides = win.map(pred);
    const pos = sides.filter((x) => x === 1).length;
    const neg = sides.filter((x) => x === -1).length;
    const ok = needSameSide ? (pos >= m || neg >= m) : (pos + neg >= m);
    if (ok) {
      // 标出窗口内真正满足条件的点
      win.forEach((v, j) => { if (sides[j] !== 0) hits.add(i - w + 1 + j); });
    }
  }
  return [...hits].sort((a, b) => a - b);
}

/** 连续 w 个点同侧（忽略恰在中心线上的点则按 0 处理，这里要求严格同侧）。 */
function runOfSide(values: number[], c: number, w: number): number[] {
  const hits = new Set<number>();
  for (let i = w - 1; i < values.length; i++) {
    const win = values.slice(i - w + 1, i + 1);
    const allPos = win.every((v) => v > c);
    const allNeg = win.every((v) => v < c);
    if (allPos || allNeg) for (let j = 0; j < w; j++) hits.add(i - w + 1 + j);
  }
  return [...hits].sort((a, b) => a - b);
}

/** 连续 w 个点严格单调（递增或递减）。 */
function runTrend(values: number[], w: number): number[] {
  const hits = new Set<number>();
  for (let i = w - 1; i < values.length; i++) {
    const win = values.slice(i - w + 1, i + 1);
    let inc = true, dec = true;
    for (let j = 1; j < w; j++) {
      if (win[j] <= win[j - 1]) inc = false;
      if (win[j] >= win[j - 1]) dec = false;
    }
    if (inc || dec) for (let j = 0; j < w; j++) hits.add(i - w + 1 + j);
  }
  return [...hits].sort((a, b) => a - b);
}

/** 连续 w 个点上下交替。 */
function runAlternating(values: number[], w: number): number[] {
  const hits = new Set<number>();
  if (w < 2) return [];
  for (let i = w - 1; i < values.length; i++) {
    const win = values.slice(i - w + 1, i + 1);
    const diffs: number[] = [];
    for (let j = 1; j < w; j++) diffs.push(Math.sign(win[j] - win[j - 1]));
    let alt = true;
    for (let j = 1; j < diffs.length; j++) {
      if (diffs[j] === 0 || diffs[j] === diffs[j - 1]) { alt = false; break; }
    }
    if (alt) for (let j = 0; j < w; j++) hits.add(i - w + 1 + j);
  }
  return [...hits].sort((a, b) => a - b);
}

/** 连续 w 个点全部落在 ±kσ 内（或全部落在 ±kσ 外）。 */
function runWithinOrBeyond(values: number[], c: number, s: number, w: number, k: number, within: boolean): number[] {
  const hits = new Set<number>();
  for (let i = w - 1; i < values.length; i++) {
    const win = values.slice(i - w + 1, i + 1);
    const ok = within
      ? win.every((v) => Math.abs(v - c) < k * s)
      : win.every((v) => Math.abs(v - c) > k * s);
    if (ok) for (let j = 0; j < w; j++) hits.add(i - w + 1 + j);
  }
  return [...hits].sort((a, b) => a - b);
}

function mk(hits: number[], id: string, zh: string, en: string, desc: string, descEn: string): RuleHit {
  return {
    id, zh, en, desc, descEn,
    triggered: hits.length > 0,
    hits,
    points: hits.map((i) => i + 1),
  };
}

/** 计算两套判异准则。values 至少需要 2 个点。 */
export function analyzeRules(values: number[]): SpcRuleReport {
  const v = values.filter((x) => Number.isFinite(x));
  const c = mean(v);
  const s = std(v) || 1e-9;
  const ucl = c + 3 * s, lcl = c - 3 * s;
  const zones = {
    upper3: c + 3 * s, upper2: c + 2 * s, upper1: c + s,
    lower1: c - s, lower2: c - 2 * s, lower3: c - 3 * s,
  };

  // —— Western Electric 4 条 ——
  const we1 = windowRule(v, 1, 1, (x) => (beyond(x, c, s, 3, 1) ? 1 : beyond(x, c, s, 3, -1) ? -1 : 0));
  const we2 = windowRule(v, 3, 2, (x) => (beyond(x, c, s, 2, 1) ? 1 : beyond(x, c, s, 2, -1) ? -1 : 0));
  const we3 = windowRule(v, 5, 4, (x) => (beyond(x, c, s, 1, 1) ? 1 : beyond(x, c, s, 1, -1) ? -1 : 0));
  const we4 = runOfSide(v, c, 8);
  const westernElectric: RuleHit[] = [
    mk(we1, 'WE1', '单点超出 3σ 控制限', '1 point beyond 3σ',
      '任一点落在 UCL/LCL 之外，是最明确的异常信号。', 'Any single point outside UCL/LCL — the clearest out-of-control signal.'),
    mk(we2, 'WE2', '连续 3 点中 2 点超出同侧 2σ', '2 of 3 beyond 2σ (same side)',
      '提示过程均值开始向一侧漂移。', 'Suggests the process mean is shifting to one side.'),
    mk(we3, 'WE3', '连续 5 点中 4 点超出同侧 1σ', '4 of 5 beyond 1σ (same side)',
      '较小的持续偏移，早期预警。', 'A smaller, sustained shift — an early warning.'),
    mk(we4, 'WE4', '连续 8 点落在中心线同侧', '8 consecutive on one side of center',
      '过程存在系统性偏置。', 'Indicates a systematic bias in the process.'),
  ];

  // —— Nelson 8 条 ——
  const n1 = windowRule(v, 1, 1, (x) => (beyond(x, c, s, 3, 1) ? 1 : beyond(x, c, s, 3, -1) ? -1 : 0));
  const n2 = runOfSide(v, c, 9);
  const n3 = runTrend(v, 6);
  const n4 = runAlternating(v, 14);
  const n5 = windowRule(v, 3, 2, (x) => (beyond(x, c, s, 2, 1) ? 1 : beyond(x, c, s, 2, -1) ? -1 : 0));
  const n6 = windowRule(v, 5, 4, (x) => (beyond(x, c, s, 1, 1) ? 1 : beyond(x, c, s, 1, -1) ? -1 : 0));
  const n7 = runWithinOrBeyond(v, c, s, 15, 1, true);
  const n8 = runWithinOrBeyond(v, c, s, 8, 1, false);
  const nelson: RuleHit[] = [
    mk(n1, 'N1', '单点超出 3σ', '1 point beyond 3σ',
      '超出控制限，明确失控。', 'Point beyond control limits — clearly out of control.'),
    mk(n2, 'N2', '连续 9 点同侧', '9 consecutive on one side',
      '均值发生偏移。', 'A shift in the process mean.'),
    mk(n3, 'N3', '连续 6 点持续上升或下降', '6 consecutive steadily increasing/decreasing',
      '存在趋势 / 漂移。', 'A trend or drift is present.'),
    mk(n4, 'N4', '连续 14 点上下交替', '14 consecutive alternating up/down',
      '可能是过度调整或系统性振荡。', 'May indicate over-adjustment or systematic oscillation.'),
    mk(n5, 'N5', '连续 3 点中 2 点超出同侧 2σ', '2 of 3 beyond 2σ (same side)',
      '均值向一侧偏移。', 'Mean shifting to one side.'),
    mk(n6, 'N6', '连续 5 点中 4 点超出同侧 1σ', '4 of 5 beyond 1σ (same side)',
      '持续的小幅偏移。', 'A sustained small shift.'),
    mk(n7, 'N7', '连续 15 点全部落在 ±1σ 内', '15 consecutive within ±1σ',
      '变异异常小（可能分层 / 数据被修饰 / 控制限过宽）。', 'Unusually low variation — possible stratification or too-wide limits.'),
    mk(n8, 'N8', '连续 8 点全部落在 ±1σ 外', '8 consecutive with none within ±1σ',
      '双峰 / 混合分布，变异异常大。', 'Bimodal / mixed distribution — unusually large variation.'),
  ];

  const flagged = [...new Set([...westernElectric, ...nelson].flatMap((r) => r.hits))].sort((a, b) => a - b);

  return { values: v, center: c, sigma: s, ucl, lcl, zones, westernElectric, nelson, flagged };
}
