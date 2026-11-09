// lib/seoCalc.ts — SEO 工具页的「计算层」：把引擎统计结果转成可展示的指标卡 / 结论 / 判异报告。
// 口径全部复用项目引擎（stats.js / spc.js / parser.js），保证工具页与 Studio / 报告完全一致，
// 不另起炉灶、不引入第三方统计库。纯函数，客户端可用。
import { mean, std, quantile, min, max, linearRegression, iMR, capability, histogram as histBins } from './engine/stats/stats.js';
import { xbarR, pChart, npChart, cChart, uChart, runChart, gageRR } from './engine/charts/spc.js';
import { parseTable, numericColumns, categoricalColumns } from './engine/data/parser.js';
import { analyzeRules, type SpcRuleReport } from './spcRules';
import type { L, FaqItem, SeoPage } from './seoPages';

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';
export interface StatCard { label: L; value: string; hint?: L; tone?: Tone }
export interface Verdict { text: L; tone: Tone }
export interface CalcResult {
  cards: StatCard[];
  verdict?: Verdict;
  ruleReport?: SpcRuleReport;   // 判异器专用：供组件渲染逐条规则表
  error?: string;
}

const f = (n: number, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : '—');
const B = (zh: string, en: string): L => ({ zh, en });

export interface ToolInputs {
  data: string;                 // CSV 或鱼骨图 JSON
  usl?: number | null;
  lsl?: number | null;
  subgroup?: number | null;
  bins?: number | null;
}

/** 从 CSV 文本取第一/第二数值列（工具页绝大多数是单列或两列）。 */
function numericCols(text: string) {
  const table = parseTable(text);
  const nums = numericColumns(table);
  const cats = categoricalColumns(table);
  return { table, nums, cats };
}
function firstVals(text: string): number[] {
  const { nums } = numericCols(text);
  return nums.length ? nums[0].values.slice() as number[] : [];
}

/** 主入口：按页面 mode 分发计算。 */
export function computeFor(page: SeoPage, inputs: ToolInputs): CalcResult {
  const { data, usl, lsl, subgroup, bins } = inputs;
  // hub / compare 是「带演示工具的复合页」，按其所挂载的图型复用同一套计算口径。
  let mode = page.mode;
  if (mode === 'hub') mode = 'control';
  if (mode === 'compare') mode = 'capability';

  try {
    // —— 鱼骨图（JSON 结构统计）——
    if (mode === 'fishbone') {
      let j: any = {};
      try { j = JSON.parse(data); } catch { return { cards: [], error: 'parse-error' }; }
      const bones = Array.isArray(j.bones) ? j.bones : [];
      const causes = bones.reduce((s: number, b: any) => s + (Array.isArray(b.causes) ? b.causes.length : 0), 0);
      const cards: StatCard[] = [
        { label: B('主骨（原因大类）', 'Major bones'), value: String(bones.length) },
        { label: B('原因条目', 'Cause items'), value: String(causes) },
        { label: B('每类平均原因数', 'Avg causes / bone'), value: bones.length ? f(causes / bones.length, 1) : '0' },
      ];
      return {
        cards,
        verdict: { text: B('按 5M1E 组织原因后，建议再用柏拉图量化各类别贡献，锁定关键少数。',
          'After grouping causes by 5M1E, quantify each category with a Pareto chart to isolate the vital few.'), tone: 'neutral' },
      };
    }

    // —— 判异准则（Western Electric / Nelson）——
    if (mode === 'rules-western' || mode === 'rules-nelson') {
      const v = firstVals(data);
      if (v.length < 2) return { cards: [], error: 'need-data' };
      const rep = analyzeRules(v);
      const list = mode === 'rules-western' ? rep.westernElectric : rep.nelson;
      const hit = list.filter((r) => r.triggered).length;
      const cards: StatCard[] = [
        { label: B('中心线 CL', 'Center line CL'), value: f(rep.center) },
        { label: B('标准差 σ', 'Std dev σ'), value: f(rep.sigma) },
        { label: B('上控制限 UCL', 'Upper limit UCL'), value: f(rep.ucl) },
        { label: B('下控制限 LCL', 'Lower limit LCL'), value: f(rep.lcl) },
        { label: B('触发规则数', 'Triggered rules'), value: `${hit} / ${list.length}`, tone: hit ? 'warn' : 'ok' },
        { label: B('被标记点数', 'Flagged points'), value: String(rep.flagged.length), tone: rep.flagged.length ? 'warn' : 'ok' },
      ];
      return {
        cards, ruleReport: rep,
        verdict: {
          text: rep.flagged.length
            ? B(`检测到 ${rep.flagged.length} 个异常点，命中 ${hit} 条准则，建议回查对应批次/班次。`, `${rep.flagged.length} flagged points across ${hit} rules — trace back to the corresponding lot / shift.`)
            : B('未检测到任何判异信号，过程呈随机波动。', 'No rule violations detected — variation appears random.'),
          tone: rep.flagged.length ? 'warn' : 'ok',
        },
      };
    }

    // —— 过程能力 Cp / Cpk ——
    if (mode === 'capability') {
      const v = firstVals(data);
      if (v.length < 2) return { cards: [], error: 'need-data' };
      const cap = capability(v, usl ?? undefined, lsl ?? undefined);
      const m = cap.mean, s = cap.sigma;
      const cards: StatCard[] = [
        { label: B('样本量 n', 'Sample n'), value: String(v.length) },
        { label: B('均值 μ', 'Mean μ'), value: f(m) },
        { label: B('标准差 σ', 'Std dev σ'), value: f(s) },
        { label: B('Cp', 'Cp'), value: cap.cp != null ? f(cap.cp) : '—', hint: B('需双边规格限', 'Needs both spec limits') },
        { label: B('Cpu / Cpl', 'Cpu / Cpl'), value: `${cap.cpu != null ? f(cap.cpu) : '—'} / ${cap.cpl != null ? f(cap.cpl) : '—'}` },
        { label: B('Cpk', 'Cpk'), value: cap.cpk != null ? f(cap.cpk) : '—', tone: cap.cpk == null ? 'neutral' : cap.cpk >= 1.33 ? 'ok' : cap.cpk >= 1.0 ? 'warn' : 'bad' },
      ];
      let verdict: Verdict;
      if (cap.cpk == null) verdict = { text: B('填入 USL 与 LSL 后即可计算 Cpk。', 'Enter USL and LSL to compute Cpk.'), tone: 'neutral' };
      else if (cap.cpk >= 1.67) verdict = { text: B('过程能力优秀（Cpk ≥ 1.67）。', 'Excellent capability (Cpk ≥ 1.67).'), tone: 'ok' };
      else if (cap.cpk >= 1.33) verdict = { text: B('过程能力充足（Cpk ≥ 1.33）。', 'Adequate capability (Cpk ≥ 1.33).'), tone: 'ok' };
      else if (cap.cpk >= 1.0) verdict = { text: B('过程能力边缘（1.0 ≤ Cpk < 1.33），建议持续优化变异。', 'Marginal capability (1.0 ≤ Cpk < 1.33) — keep reducing variation.'), tone: 'warn' };
      else verdict = { text: B('过程能力不足（Cpk < 1.0）：变异相对规格过宽，需优先收窄。', 'Inadequate capability (Cpk < 1.0): variation is too wide vs spec.'), tone: 'bad' };
      return { cards, verdict };
    }

    // —— I-MR 控制图 ——
    if (mode === 'control') {
      const v = firstVals(data);
      if (v.length < 2) return { cards: [], error: 'need-data' };
      const cc = iMR(v);
      const bad = cc.flags.filter((x: any[]) => x.length > 0).length;
      const cards: StatCard[] = [
        { label: B('样本量 n', 'Sample n'), value: String(v.length) },
        { label: B('中心线 CL', 'Center line CL'), value: f(cc.cl) },
        { label: B('上控制限 UCL', 'Upper limit UCL'), value: f(cc.ucl) },
        { label: B('下控制限 LCL', 'Lower limit LCL'), value: f(cc.lcl) },
        { label: B('标准差 σ', 'Std dev σ'), value: f(cc.sigma) },
        { label: B('判异点', 'Flagged points'), value: String(bad), tone: bad ? 'warn' : 'ok' },
      ];
      return {
        cards,
        verdict: bad
          ? { text: B(`检测到 ${bad} 个判异点，过程可能存在特殊原因变异，建议排查。`, `${bad} flagged points — possible special-cause variation, investigate.`), tone: 'warn' }
          : { text: B('全部点落在控制限内，未检测到判异信号。', 'All points within limits — no signals detected.'), tone: 'ok' },
      };
    }

    // —— X̄-R 控制图 ——
    if (mode === 'xbarR') {
      const v = firstVals(data);
      if (v.length < 4) return { cards: [], error: 'need-data' };
      const xr = xbarR(v, subgroup || 0);
      const cards: StatCard[] = [
        { label: B('子组大小 n', 'Subgroup n'), value: String(xr.n) },
        { label: B('子组数', 'Subgroups'), value: String(xr.xbars.length) },
        { label: B('总均值 X̿', 'Grand mean X̿'), value: f(xr.Xdbl) },
        { label: B('平均极差 R̄', 'Avg range R̄'), value: f(xr.Rbar) },
        { label: B('X̄ 图 UCL / LCL', 'X̄ UCL / LCL'), value: `${f(xr.xucl)} / ${f(xr.xlcl)}` },
        { label: B('R 图 UCL', 'R UCL'), value: f(xr.rucl) },
      ];
      return { cards, verdict: { text: B('先判读 R 图（离散是否稳定），再判读 X̄ 图（均值是否偏移）。', 'Read the R chart first (spread), then the X̄ chart (mean).'), tone: 'neutral' } };
    }

    // —— Gage R&R ——
    if (mode === 'msa') {
      const { nums, cats } = numericCols(data);
      if (!nums.length || cats.length < 2) return { cards: [], error: 'need-data' };
      const opCol = cats[0], partCol = cats[1], valCol = nums[0];
      const rows = valCol.values.map((val: number, i: number) => ({
        op: String(opCol.values[i] ?? 'A'), part: String(partCol.values[i] ?? i), val,
      }));
      const g = gageRR(rows);
      const cards: StatCard[] = [
        { label: B('操作员 / 零件 / 重复', 'Ops / Parts / Reps'), value: `${g.k} / ${g.n} / ${g.r}` },
        { label: B('重复性 EV', 'Repeatability EV'), value: `${f(g.pctEV, 1)}%` },
        { label: B('再现性 AV', 'Reproducibility AV'), value: `${f(g.pctAV, 1)}%` },
        { label: B('%GRR（研究变异）', '%GRR (Study Var)'), value: `${f(g.pctGRR, 1)}%`, tone: g.pctGRR < 10 ? 'ok' : g.pctGRR <= 30 ? 'warn' : 'bad' },
        { label: B('零件变差 PV', 'Part variation PV'), value: `${f(g.pctPV, 1)}%` },
        { label: B('可区分类别数 ndc', 'Distinct categories ndc'), value: f(g.ndc, 1), tone: g.ndc >= 5 ? 'ok' : 'warn' },
      ];
      const verdict: Verdict = g.pctGRR < 10
        ? { text: B('测量系统可接受（%GRR < 10%）。', 'Measurement system acceptable (%GRR < 10%).'), tone: 'ok' }
        : g.pctGRR <= 30
          ? { text: B('有条件可接受（10–30%），需结合特性重要性说明理由。', 'Conditionally acceptable (10–30%) — document the rationale.'), tone: 'warn' }
          : { text: B('测量系统不可接受（%GRR > 30%），需优先改进。', 'Measurement system unacceptable (%GRR > 30%) — improve it first.'), tone: 'bad' };
      return { cards, verdict };
    }

    // —— p / np / c / u 属性控制图 ——
    if (mode === 'p' || mode === 'np' || mode === 'c' || mode === 'u') {
      const { nums } = numericCols(data);
      if (!nums.length) return { cards: [], error: 'need-data' };
      let cards: StatCard[] = [];
      let bad = 0;
      if (mode === 'c') {
        const c = cChart(nums[0].values.slice() as number[]);
        bad = c.points.filter((p: any) => p.flag).length;
        cards = [
          { label: B('平均缺陷数 c̄', 'Mean defects c̄'), value: f(c.cbar) },
          { label: B('UCL / LCL', 'UCL / LCL'), value: `${f(c.ucl)} / ${f(c.lcl)}` },
        ];
      } else {
        const d = (nums.length >= 2 ? nums[nums.length - 2] : nums[0]).values.slice() as number[];
        const sz = (nums.length >= 2 ? nums[nums.length - 1] : { values: d.map(() => 1) }).values.slice() as number[];
        if (mode === 'p') {
          const p = pChart(d, sz);
          bad = p.points.filter((x: any) => x.flag).length;
          cards = [
            { label: B('平均不良率 p̄', 'Mean proportion p̄'), value: f(p.pbar, 4) },
            { label: B('首/末点 UCL', 'First / last UCL'), value: `${f(p.points[0]?.ucl, 4)} / ${f(p.points[p.points.length - 1]?.ucl, 4)}` },
          ];
        } else if (mode === 'np') {
          const np = npChart(d, sz);
          bad = np.points.filter((x: any) => x.flag).length;
          cards = [
            { label: B('平均不良率 p̄', 'Mean proportion p̄'), value: f(np.pbar, 4) },
            { label: B('中心线 n·p̄', 'Center n·p̄'), value: f(np.cl) },
            { label: B('UCL / LCL', 'UCL / LCL'), value: `${f(np.ucl)} / ${f(np.lcl)}` },
          ];
        } else {
          const u = uChart(d, sz);
          bad = u.points.filter((x: any) => x.flag).length;
          cards = [
            { label: B('单位缺陷数 ū', 'Defects per unit ū'), value: f(u.ubar, 4) },
            { label: B('首/末点 UCL', 'First / last UCL'), value: `${f(u.points[0]?.ucl, 4)} / ${f(u.points[u.points.length - 1]?.ucl, 4)}` },
          ];
        }
      }
      cards.push({ label: B('越限点数', 'Out-of-limit points'), value: String(bad), tone: bad ? 'warn' : 'ok' });
      return {
        cards,
        verdict: bad
          ? { text: B(`检测到 ${bad} 个越限点，建议回查对应批次。`, `${bad} out-of-limit points — trace back to the corresponding lot.`), tone: 'warn' }
          : { text: B('全部点在控制限内，过程稳定。', 'All points within limits — process appears stable.'), tone: 'ok' },
      };
    }

    // —— 运行图 ——
    if (mode === 'run') {
      const v = firstVals(data);
      if (v.length < 2) return { cards: [], error: 'need-data' };
      const r = runChart(v);
      const shifts = r.flags.filter((x: any[]) => x.includes('Shift')).length;
      const trends = r.flags.filter((x: any[]) => x.includes('Trend')).length;
      const cards: StatCard[] = [
        { label: B('样本量 n', 'Sample n'), value: String(v.length) },
        { label: B('中位数', 'Median'), value: f(r.med) },
        { label: B('漂移信号', 'Shift signals'), value: String(shifts), tone: shifts ? 'warn' : 'ok' },
        { label: B('趋势信号', 'Trend signals'), value: String(trends), tone: trends ? 'warn' : 'ok' },
      ];
      return {
        cards,
        verdict: (shifts || trends)
          ? { text: B('检测到非随机信号（漂移 / 趋势），过程可能已发生变化。', 'Non-random signals (shift / trend) detected — the process may have changed.'), tone: 'warn' }
          : { text: B('未检测到明显漂移或趋势。', 'No obvious shift or trend detected.'), tone: 'ok' },
      };
    }

    // —— 散点图 / 回归 ——
    if (mode === 'scatter') {
      const { nums } = numericCols(data);
      if (nums.length < 2) return { cards: [], error: 'need-data' };
      const xs = nums[0].values.slice() as number[];
      const ys = nums[1].values.slice() as number[];
      const n = Math.min(xs.length, ys.length);
      const reg = linearRegression(xs.slice(0, n), ys.slice(0, n));
      const strength = Math.abs(reg.r);
      const cards: StatCard[] = [
        { label: B('数据点 n', 'Points n'), value: String(n) },
        { label: B('斜率', 'Slope'), value: f(reg.slope, 4) },
        { label: B('截距', 'Intercept'), value: f(reg.intercept, 4) },
        { label: B('相关系数 r', 'Pearson r'), value: f(reg.r, 4) },
        { label: B('决定系数 R²', 'R²'), value: f(reg.r2, 4) },
        { label: B('相关性', 'Strength'), value: strength >= 0.8 ? '强' : strength >= 0.5 ? '中' : strength >= 0.3 ? '弱' : '无', tone: strength >= 0.5 ? 'ok' : 'neutral' },
      ];
      return { cards, verdict: { text: B('相关不等于因果：高 R² 只说明线性关联强。', 'Correlation is not causation: a high R² only means a strong linear association.'), tone: 'neutral' } };
    }

    // —— 直方图 ——
    if (mode === 'histogram') {
      const v = firstVals(data);
      if (v.length < 2) return { cards: [], error: 'need-data' };
      const h = histBins(v, bins || 0);
      const cards: StatCard[] = [
        { label: B('样本量 n', 'Sample n'), value: String(v.length) },
        { label: B('均值 μ', 'Mean μ'), value: f(mean(v)) },
        { label: B('标准差 σ', 'Std dev σ'), value: f(std(v)) },
        { label: B('最小 / 最大', 'Min / Max'), value: `${f(min(v), 2)} / ${f(max(v), 2)}` },
        { label: B('分箱数', 'Bins'), value: String(h.n) },
      ];
      return { cards };
    }

    // —— 箱线图 ——
    if (mode === 'boxplot') {
      const { nums, cats } = numericCols(data);
      if (!nums.length) return { cards: [], error: 'need-data' };
      const vals = nums[0].values.slice() as number[];
      const labels = cats[0]?.values ?? [];
      const groups = [...new Set(labels.map(String))];
      const sorted = [...vals].sort((a, b) => a - b);
      const cards: StatCard[] = [
        { label: B('样本量 n', 'Sample n'), value: String(vals.length) },
        { label: B('分组数', 'Groups'), value: String(groups.length || 1) },
        { label: B('中位数', 'Median'), value: f(quantile(sorted, 0.5)) },
        { label: B('Q1 / Q3', 'Q1 / Q3'), value: `${f(quantile(sorted, 0.25))} / ${f(quantile(sorted, 0.75))}` },
        { label: B('最小 / 最大', 'Min / Max'), value: `${f(min(vals), 2)} / ${f(max(vals), 2)}` },
      ];
      return { cards };
    }

    // —— 柏拉图 ——
    if (mode === 'pareto') {
      const { nums, cats } = numericCols(data);
      if (!nums.length) return { cards: [], error: 'need-data' };
      const vals = nums[0].values.slice() as number[];
      const total = vals.reduce((a, b) => a + b, 0);
      const sorted = [...vals].sort((a, b) => b - a);
      let cum = 0, k80 = 0;
      for (const x of sorted) { if (cum / total >= 0.8) break; cum += x; k80++; }
      const cards: StatCard[] = [
        { label: B('类别数', 'Categories'), value: String(vals.length) },
        { label: B('总频数', 'Total count'), value: String(total) },
        { label: B('最大类占比', 'Largest share'), value: `${f((sorted[0] / total) * 100, 1)}%` },
        { label: B('累计达 80% 的类别数', 'Classes to reach 80%'), value: String(k80), tone: 'neutral' },
      ];
      return { cards, verdict: { text: B(`前 ${k80} 类贡献约 80% 的问题，建议优先改善（关键少数）。`, `The top ${k80} categories account for ~80% — prioritize these vital few.`), tone: 'neutral' } };
    }

    return { cards: [] };
  } catch (e) {
    return { cards: [], error: 'parse-error' };
  }
}
