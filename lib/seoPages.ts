// lib/seoPages.ts — SEO 落地页「单一数据源」。
// 20 个意图最纯的 SPC / 质量工具关键词，每页都对应一个「可真算、可真出图」的在线工具，
// 而不是文字占位页。page.tsx 用它生成 metadata / JSON-LD / 内容，SeoTool 用它驱动交互。
// 与引擎解耦：示例数据由 SeoTool 通过 chartType 从 SAMPLES 取得，这里只描述规格。
import type { ChartType } from './charts';

export type Lang = 'zh' | 'en';
export interface L { zh: string; en: string }
export interface FaqItem { q: L; a: L }

export type ToolMode =
  | 'capability' | 'control' | 'xbarR' | 'pareto' | 'histogram' | 'fishbone' | 'msa'
  | 'p' | 'np' | 'c' | 'u' | 'run' | 'scatter' | 'boxplot'
  | 'rules-western' | 'rules-nelson'
  | 'hub' | 'compare';

export type FieldKey = 'usl' | 'lsl' | 'subgroup' | 'bins';
export type CalcKind = 'capability' | 'control' | 'xbarR' | 'gageRR' | 'p' | 'np' | 'c' | 'u' | 'run' | 'scatter' | 'histogram' | 'rules' | 'boxplot' | 'none';

export interface SeoPage {
  slug: string;
  tier: 1 | 2;
  kw: string;                 // 主关键词（英文，SEO 用）
  icon: string;               // 卡片图标（自绘 SVG 前的占位字形，避免 emoji 字体差异）
  category: L;                // 分类名
  h1: L;                      // H1（两种语言都含关键词，保证默认中文时 Google 也能抓到）
  lead: L;                    // 价值主张一句话
  desc: L;                    // meta description
  about: L[];                 // 正文段落（SEO 实质内容）
  features: L[];              // 要点
  faq: FaqItem[];             // FAQPage Schema 来源
  mode: ToolMode;
  chartType: ChartType | null;
  calc: CalcKind;
  fields: FieldKey[];         // 需要用户输入的参数
  related: string[];          // 内链 slug
  sampleOverride?: string;    // 专属示例数据（如判异器需一段含异常信号的数据）
}

const B = (zh: string, en: string): L => ({ zh, en });
const F = (qz: string, qe: string, az: string, ae: string): FaqItem => ({ q: B(qz, qe), a: B(az, ae) });

// 通用要点（复用以减少样板，但每页首条为差异化）
const F_FREE = B('免费、免注册、无需安装：打开浏览器粘贴数据即可出结果，数据不上传服务器。', 'Free, no sign-up, no install — paste data in the browser and get an instant result; your data never leaves the page.');
const F_SVG = B('导出可编辑矢量 SVG 与 2× PNG，可直接进 PPT / 报告 / 论文，无限缩放不糊。', 'Export editable vector SVG and 2× PNG — drop straight into slides, reports or papers with no pixelation.');
const F_STAT = B('统计口径对齐 AIAG / Western Electric 标准，给出可读结论而不只是一张图。', 'Statistics follow AIAG / Western Electric conventions and ship a plain-language verdict, not just a picture.');
const F_STUDIO = B('一键在 Studio 打开，继续改主题、加参考线、导出或分享链接。', 'Open in Studio with one click to change themes, add reference lines, export or share a link.');

const FAQ_FREE = F('这个工具真的免费吗？', 'Is this tool really free?',
  '是。所有计算与出图在你的浏览器本地完成，免费、免注册、无水印（保留署名），不需要信用卡。', 'Yes. Every calculation runs locally in your browser — free, no sign-up, no credit card, with only a small attribution.');
const FAQ_DATA = F('我的数据会上传到服务器吗？', 'Is my data uploaded to a server?',
  '不会。ChartForge 的图表引擎是纯前端 SVG 渲染，粘贴的数据只在当前页面内存中处理，刷新即消失。', 'No. ChartForge renders charts entirely client-side; pasted data stays in the page memory and disappears on refresh.');
const FAQ_EXPORT = F('可以导出哪些格式？', 'Which export formats are supported?',
  '支持矢量 SVG（可在 PowerPoint / Illustrator 里继续编辑）与 2 倍分辨率 PNG。两者都带透明背景。', 'Vector SVG (editable in PowerPoint / Illustrator) and 2× PNG, both with a transparent background.');

export const SEO_PAGES: SeoPage[] = [
  // ============================ Tier 1：意图最纯 ============================
  {
    slug: 'cpk-calculator', tier: 1, kw: 'Cpk Calculator', icon: 'Cp',
    category: B('过程能力', 'Capability'),
    h1: B('Cpk 计算器 — 在线计算过程能力指数 Cp / Cpk', 'Cpk Calculator — Free Online Process Capability Index'),
    lead: B('粘贴测量值、填入规格上下限，立刻得到 Cp、Cpk、Cpu、Cpl 与能力评级，并叠加规格限的能力直方图。', 'Paste measurements, enter your spec limits, and instantly get Cp, Cpk, Cpu, Cpl and a capability verdict — plus a histogram overlaid with spec limits.'),
    desc: B('免费在线 Cpk 计算器：输入测量数据与 USL/LSL，实时计算 Cp、Cpk、Cpu、Cpl、均值与 σ，给出 AIAG 能力评级，导出矢量能力直方图。免注册、数据不上传。', 'Free online Cpk calculator: enter measurements and USL/LSL to compute Cp, Cpk, Cpu, Cpl, mean and σ with an AIAG verdict and an exportable capability histogram. No sign-up, client-side only.'),
    about: [
      B('Cpk（过程能力指数）衡量的是：在过程均值存在偏移的情况下，过程输出落在规格限内的能力。它同时考虑离散程度（σ）与居中程度（均值离规格中心多远），因此比只看 Cp 更贴近实际良率。公式上 Cp = (USL − LSL) / 6σ，Cpk = min[(USL − μ)/3σ, (μ − LSL)/3σ]。', 'Cpk (process capability index) measures how well a process fits inside specification limits once the mean is allowed to be off-center. It accounts for both spread (σ) and centering, so it predicts real yield better than Cp alone. Cp = (USL − LSL) / 6σ; Cpk = min[(USL − μ)/3σ, (μ − LSL)/3σ].'),
      B('通用评级：Cpk ≥ 1.67 优秀、≥ 1.33 充足、1.0–1.33 边缘、< 1.0 不足。注意 Cpk 只在过程统计受控时才有意义——先确认控制图稳定，再谈能力。本工具用样本标准差（n−1）估计 σ，与 AIAG SPC 手册口径一致。', 'Common grading: Cpk ≥ 1.67 excellent, ≥ 1.33 adequate, 1.0–1.33 marginal, < 1.0 inadequate. Cpk is only meaningful for a statistically stable process — verify your control chart first. σ is estimated with the sample standard deviation (n−1), consistent with the AIAG SPC manual.'),
    ],
    features: [B('同时给出 Cp / Cpk / Cpu / Cpl 与均值、σ，不只一个孤零零的数字。', 'Reports Cp / Cpk / Cpu / Cpl plus mean and σ — not a single number in isolation.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('Cp 和 Cpk 有什么区别？', 'What is the difference between Cp and Cpk?',
        'Cp 只衡量潜在能力（规格宽度 ÷ 6σ），假设过程完全居中；Cpk 额外惩罚均值偏移，取上下两侧能力的较小值。过程不居中时 Cpk 会明显小于 Cp。', 'Cp measures potential capability (spec width ÷ 6σ) assuming perfect centering; Cpk additionally penalizes an off-center mean by taking the worse of the two sides. Cpk < Cp signals centering is the problem.'),
      F('Cpk 需要多少数据？', 'How much data do I need for Cpk?',
        '建议至少 25–30 个测量值、覆盖足够时间跨度，且过程处于统计受控。样本太少时 σ 估计不稳定，Cpk 置信区间会很宽。', 'Use at least 25–30 measurements spanning a representative period, with the process in statistical control. Small samples make σ and Cpk unstable.'),
      FAQ_DATA,
    ],
    mode: 'capability', chartType: 'capability', calc: 'capability', fields: ['usl', 'lsl'],
    related: ['process-capability-calculator', 'histogram-maker', 'control-chart-maker', 'gage-rr-calculator'],
  },
  {
    slug: 'process-capability-calculator', tier: 1, kw: 'Process Capability Calculator', icon: 'PC',
    category: B('过程能力', 'Capability'),
    h1: B('过程能力计算器 — Pp / Ppk / Cp / Cpk 一次算全', 'Process Capability Calculator — Cp, Cpk, Pp, Ppk'),
    lead: B('把一组实测数据变成完整的过程能力分析：分布直方图、正态拟合、规格限、以及一张能签字的能力结论卡。', 'Turn a set of measurements into a full capability study: distribution histogram, normal fit, spec limits, and a sign-off-ready verdict card.'),
    desc: B('免费在线过程能力分析：直方图 + 正态曲线 + USL/LSL + Cp/Cpk 评级，给出均值、σ 与改进建议。适用于 PPAP、IATF 16949 与来料/过程能力验证。', 'Free online process capability analysis: histogram, normal curve, USL/LSL and a Cp/Cpk verdict with mean, σ and improvement guidance. Built for PPAP, IATF 16949 and incoming/process capability studies.'),
    about: [
      B('过程能力分析回答一个业务问题：这条产线能不能稳定地做出符合规格的零件？它把「规格要求」与「过程实际波动」放在同一张图上——灰柱是实测分布，曲线是正态拟合，两条竖线是 LSL / USL，一眼就能看出是否有尾部超出规格。', 'A capability study answers one business question: can this line reliably make parts that meet spec? It puts the tolerance and the actual variation on the same chart — bars for the observed distribution, a fitted normal curve, and vertical LSL / USL lines — so out-of-spec tails are obvious.'),
      B('能力与受控是两件事：Cp/Cpk 描述「能不能」，控制图描述「稳不稳」。正确顺序是先用 I-MR / X̄-R 确认过程受控，再做能力分析，否则算出来的指数会被特殊原因变异污染。本工具同时提供规格限输入与一键跳转到控制图。', 'Capability and control are different questions: Cp/Cpk asks "can it", control charts ask "is it stable". Check stability first with I-MR / X̄-R, then run capability — otherwise special-cause variation contaminates the index. This tool links directly to the control chart maker.'),
    ],
    features: [B('直方图 + 正态拟合 + 规格限三合一，直接判断尾部是否超差。', 'Histogram + normal fit + spec limits in one view, so out-of-spec tails are obvious.'), F_STAT, F_STUDIO, F_FREE],
    faq: [
      F('过程能力分析前要先做什么？', 'What should I check before a capability study?',
        '先确认测量系统可接受（做 Gage R&R），再确认过程统计受控（控制图无异动），最后才计算 Cp/Cpk。三者顺序不能反。', 'First confirm the measurement system is acceptable (Gage R&R), then confirm statistical control (no signals on the control chart), and only then compute Cp/Cpk.'),
      F('Cpk 达到 1.33 就够了吗？', 'Is Cpk 1.33 enough?',
        '1.33 是汽车/制造业常见的通用下限；安全件、关键特性常要求 1.67 或更高，具体以客户与行业标准（如 PPAP、IATF 16949）为准。', '1.33 is a common general minimum in automotive/manufacturing; safety or critical characteristics often require 1.67+, per customer and standards such as PPAP or IATF 16949.'),
      FAQ_EXPORT,
    ],
    mode: 'capability', chartType: 'capability', calc: 'capability', fields: ['usl', 'lsl'],
    related: ['cpk-calculator', 'control-chart-maker', 'gage-rr-calculator', 'histogram-maker'],
  },
  {
    slug: 'control-chart-maker', tier: 1, kw: 'Control Chart Maker', icon: 'CC',
    category: B('控制图', 'Control Charts'),
    h1: B('控制图制作器 — 在线生成 I-MR 控制图并自动判异', 'Control Chart Maker — Free Online I-MR with Auto Rule Flags'),
    lead: B('粘贴一列按时间顺序的测量值，自动计算中心线、3σ 控制限，标注 Western Electric 判异点，并给出「受控 / 预警 / 失控」结论。', 'Paste a time-ordered column of measurements to auto-compute the center line, 3σ limits, flag Western Electric violations, and get an in-control / at-risk / out-of-control verdict.'),
    desc: B('免费在线控制图制作器：输入测量值自动生成 I-MR 控制图，计算 UCL/LCL、标注 Western Electric 判异点、给出可读结论，导出矢量 SVG/PNG。无需 Minitab。', 'Free online control chart maker: generate an I-MR chart from measurements with UCL/LCL, Western Electric rule flags and a plain-language verdict. Export vector SVG/PNG — no Minitab needed.'),
    about: [
      B('控制图是休哈特（Shewhart）在 1920 年代提出的工具，核心不是「画线」，而是区分两类变异：普通原因（过程固有波动）与特殊原因（换料、调机、人为失误）。中心线取均值，控制限取 ±3σ；落在限外或呈现非随机模式的点，就是需要调查的信号。', 'Invented by Walter Shewhart in the 1920s, a control chart is not about drawing lines — it separates common-cause (inherent) variation from special-cause (assignable) variation. The center line is the mean and the limits sit at ±3σ; points outside the limits, or forming non-random patterns, are signals to investigate.'),
      B('本工具默认用 I-MR（单值-移动极差）口径，适合单件测量、破坏性试验或采样成本高的场景；若你有子组数据，请用 X̄-R 图。图上会自动标注 R1（超出 3σ）、R2（3 点中 2 点超 2σ）、R3（5 点中 4 点超 1σ）、R4（连续 8 点同侧）。', 'This tool uses the I-MR (Individuals–Moving Range) convention by default — suited to single measurements, destructive tests or expensive sampling. If you have subgroups, use the X̄-R chart instead. R1 (beyond 3σ), R2 (2 of 3 beyond 2σ), R3 (4 of 5 beyond 1σ) and R4 (8 on one side) are flagged automatically.'),
    ],
    features: [B('自动算 CL / UCL / LCL 并逐点标注判异信号，不用手工套公式。', 'Auto-computes CL / UCL / LCL and flags rule violations point by point — no manual formulas.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('控制限和规格限有什么区别？', 'What is the difference between control limits and specification limits?',
        '控制限来自过程数据本身（±3σ），回答「过程稳不稳」；规格限来自客户/设计要求（USL/LSL），回答「产品合不合格」。两者绝不能混用。', 'Control limits come from the process data (±3σ) and answer "is it stable"; spec limits come from customer/design requirements (USL/LSL) and answer "does it conform". Never mix them.'),
      F('I-MR 和 X̄-R 该用哪个？', 'I-MR or X̄-R — which should I use?',
        '每次只取一个测量值（或采样很贵）用 I-MR；每个子组有多个测量值（常见 4–5 个）用 X̄-R，它对均值漂移更敏感。', 'Use I-MR when each sample yields one measurement (or sampling is costly). Use X̄-R when each subgroup has several measurements (typically 4–5) — it is more sensitive to mean shifts.'),
      FAQ_DATA,
    ],
    mode: 'control', chartType: 'control', calc: 'control', fields: [],
    related: ['imr-chart', 'xbar-r-chart', 'western-electric-rules', 'nelson-rules', 'run-chart-maker'],
  },
  {
    slug: 'xbar-r-chart', tier: 1, kw: 'Xbar R Chart', icon: 'XR',
    category: B('控制图', 'Control Charts'),
    h1: B('X̄-R 控制图（Xbar R Chart）在线生成器', 'Xbar R Chart Maker — Free Online X̄-R Control Chart'),
    lead: B('输入按子组采集的测量值，自动分组计算均值图与极差图，用 A2 / D3 / D4 常数求控制限，制造业最常用的变量控制图。', 'Enter subgrouped measurements to build the X̄ (means) and R (ranges) charts automatically, with limits from A2 / D3 / D4 constants — the workhorse variable chart in manufacturing.'),
    desc: B('免费在线 X̄-R (Xbar R) 控制图生成器：自动分组、计算 Xdoublebar / Rbar、A2/D3/D4 控制限，双图联动判异，导出矢量 SVG/PNG。', 'Free online Xbar R chart maker: auto subgrouping, Xdoublebar / Rbar, A2/D3/D4 limits, linked means & ranges charts, vector SVG/PNG export.'),
    about: [
      B('X̄-R 图由两张图组成：上方 X̄ 图监控过程均值（子组均值），下方 R 图监控过程离散（子组极差）。控制限用 X̄ 图的 Xdoublebar ± A2·Rbar、R 图的 D3·Rbar 与 D4·Rbar，其中 A2、D3、D4 只与子组大小 n 有关。', 'An X̄-R chart is two charts: the X̄ chart monitors the process mean (subgroup averages) while the R chart monitors spread (subgroup ranges). Limits use Xdoublebar ± A2·Rbar for means and D3·Rbar / D4·Rbar for ranges; A2, D3, D4 depend only on subgroup size n.'),
      B('本工具自动按你设定的子组大小（默认取 √N 并夹在 2–10）切分数据；若留空则自动推断。判读顺序：先看 R 图是否受控（离散稳定），再看 X̄ 图——因为 R 图失控会让 X̄ 图的控制限失去意义。', 'Data is split using your subgroup size (default: √N clamped to 2–10), or inferred automatically when left blank. Read the R chart first (spread must be stable), then the X̄ chart — unstable spread invalidates the means limits.'),
    ],
    features: [B('均值图 + 极差图双联动，自动套用标准 SPC 常数表（n=2…10）。', 'Linked means & ranges charts with the standard SPC constant table for n = 2…10.'), B('可调子组大小，或让工具自动推断分组。', 'Adjustable subgroup size, or let the tool infer it.'), F_SVG, F_FREE],
    faq: [
      F('子组大小应该选多少？', 'What subgroup size should I use?',
        '经典做法是 4 或 5：足够让中心极限定理发挥作用，又不至于让子组内混入时间漂移。子组应「组内差异小、组间差异大」。', 'The classic choice is 4 or 5 — large enough for the central limit effect, small enough to avoid within-subgroup drift. Form subgroups so variation within is small and variation between is meaningful.'),
      F('A2、D3、D4 是什么？', 'What are A2, D3 and D4?',
        '是把极差换算成 σ 估计的无偏常数，随子组大小 n 变化（如 n=5 时 A2=0.577、D4=2.114、D3=0）。本工具内置标准表，无需查手册。', 'Unbiasing constants that convert the average range into a σ estimate; they vary with n (e.g. n=5: A2=0.577, D4=2.114, D3=0). The standard table is built in.'),
      FAQ_EXPORT,
    ],
    mode: 'xbarR', chartType: 'xbarR', calc: 'xbarR', fields: ['subgroup'],
    related: ['control-chart-maker', 'imr-chart', 'p-chart', 'western-electric-rules'],
  },
  {
    slug: 'imr-chart', tier: 1, kw: 'IMR Chart', icon: 'IM',
    category: B('控制图', 'Control Charts'),
    h1: B('I-MR 控制图（IMR Chart）在线生成器', 'I-MR Chart Maker — Free Online Individuals & Moving Range'),
    lead: B('单值-移动极差控制图：一次只测一个值也能监控过程，自动算 I 图与 MR 图的控制限并标注异常点。', 'Individuals & Moving Range chart: monitor a process even with one reading at a time, with auto I / MR limits and flagged anomalies.'),
    desc: B('免费在线 I-MR (IMR) 控制图生成器：单值与移动极差双图，自动计算 3σ 控制限与移动极差限，标注判异点，导出矢量图。适用于单件测量与低采样频率。', 'Free online I-MR chart maker: individuals & moving range charts with 3σ limits, rule flags and vector export. Ideal for single readings and low-frequency sampling.'),
    about: [
      B('I-MR 图适用于「每个时点只有一个观测值」的场景：化工批次化验、破坏性试验、昂贵检测、低频服务指标等。I 图用单值对 3σ 控制限；MR 图用相邻两值之差的绝对值（移动极差）监控短期波动，其上限为 3.267·MRbar。', 'I-MR fits "one observation per time point": batch assays, destructive tests, expensive inspections, low-frequency service metrics. The I chart plots individual values against 3σ limits; the MR chart plots |xᵢ − xᵢ₋₁| with an upper limit of 3.267·MRbar.'),
      B('注意：I 图的 σ 若直接用整体样本标准差，容易把子组间的缓慢漂移误当成普通波动；工程上更常用 MRbar/d2（d2=1.128，n=2）来估计短期 σ。本工具给出控制限与逐点判异，并把 Western Electric 信号一并标出。', 'A caveat: estimating σ from the overall sample standard deviation can mask slow drift; engineering practice often estimates short-term σ as MRbar/d2 (d2 = 1.128 for n=2). This tool reports limits, flags points and shows Western Electric signals.'),
    ],
    features: [B('I 图 + MR 图双视图，控制限与移动极差限自动计算。', 'Paired I & MR views with automatically computed limits.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('什么时候该用 I-MR 而不是 X̄-R？', 'When should I use I-MR instead of X̄-R?',
        '当你无法或不需要在同一时点取多个重复测量时（单件、破坏性、检测昂贵、自动化连续产出），用 I-MR；能组成子组时优先 X̄-R。', 'Use I-MR when you cannot or need not take repeated measurements at the same time (single units, destructive tests, costly inspection, continuous automated output). Prefer X̄-R when subgroups are possible.'),
      F('MRbar 的 3.267 是怎么来的？', 'Where does 3.267 come from?',
        '它是 n=2 时 D4 常数（= 3 + 3·d3/d2）。移动极差本质上是容量为 2 的子组极差，因此沿用 R 图的 D4 表。', 'It is the D4 constant for n=2 (= 3 + 3·d3/d2). A moving range is just a range of a size-2 subgroup, so it uses the R-chart D4 table.'),
      FAQ_DATA,
    ],
    mode: 'control', chartType: 'control', calc: 'control', fields: [],
    related: ['control-chart-maker', 'xbar-r-chart', 'run-chart-maker', 'nelson-rules'],
  },
  {
    slug: 'pareto-chart-maker', tier: 1, kw: 'Pareto Chart Maker', icon: 'Pa',
    category: B('质量工具', 'Quality Tools'),
    h1: B('柏拉图制作器 — Pareto Chart Maker（80/20 分析）', 'Pareto Chart Maker — Free Online 80/20 Analysis'),
    lead: B('输入缺陷/问题类别与频数，自动按降序排列并叠加累计百分比折线，一眼定位「关键少数」。', 'Enter defect categories and counts to get descending bars plus a cumulative-percent line that surfaces the vital few.'),
    desc: B('免费在线柏拉图 (Pareto chart) 制作器：降序柱形 + 累计百分比折线，自动 80/20 分析，定位主要质量问题，导出矢量图。', 'Free online Pareto chart maker: descending bars + cumulative percentage line for instant 80/20 analysis. Export vector charts, no sign-up.'),
    about: [
      B('柏拉图基于帕累托原则：少数几类原因往往造成大部分问题。做法是把各类别按频数降序画成柱形，再叠加一条累计百分比折线；通常累计到 80% 之前的那几类，就是应优先投入改善资源的「关键少数」。', 'The Pareto chart applies the Pareto principle: a few causes usually account for most problems. Categories are drawn as descending bars with a cumulative-percent line; the categories before the cumulative curve reaches ~80% are your "vital few".'),
      B('它是 QC 七大工具之一，常与鱼骨图配套——先用鱼骨图发散可能原因，再用柏拉图量化哪几类真正值得动手。本工具会自动排序、算累计百分比，并支持在同一份数据上切换柱状 / 饼 / 树图做对照。', 'One of the seven basic QC tools, it pairs naturally with the fishbone diagram: brainstorm causes with the fishbone, then quantify which ones matter with a Pareto. This tool sorts, computes cumulative %, and lets you switch to bar / pie / treemap on the same data.'),
    ],
    features: [B('自动降序排序 + 累计百分比折线，直接读出 80% 分界。', 'Auto sorting + cumulative-percent line make the 80% cut-off obvious.'), F_SVG, F_STUDIO, F_FREE],
    faq: [
      F('柏拉图的 80/20 是硬性规则吗？', 'Is the 80/20 split a hard rule?',
        '不是。它是经验法则，用于排优先级；实际可能是 70/30 或 90/10。重点是把少数高贡献类别与长尾区分开。', 'No — it is a rule of thumb for prioritization. Real data may be 70/30 or 90/10. The point is to separate the few high-contribution categories from the long tail.'),
      F('数据需要预先排序吗？', 'Do I need to sort my data first?',
        '不需要。粘贴「类别,频数」两列即可，工具会自动按频数降序排列并计算累计百分比。', 'No. Paste two columns (category, count) and the tool sorts descending and computes cumulative % for you.'),
      FAQ_EXPORT,
    ],
    mode: 'pareto', chartType: 'pareto', calc: 'none', fields: [],
    related: ['fishbone-diagram-maker', 'histogram-maker', 'control-chart-maker', 'scatter-plot-maker'],
  },
  {
    slug: 'histogram-maker', tier: 1, kw: 'Histogram Maker', icon: 'Hi',
    category: B('统计分析', 'Statistics'),
    h1: B('直方图制作器 — Histogram Maker（叠加正态曲线与规格限）', 'Histogram Maker — Free Online with Normal Curve & Spec Limits'),
    lead: B('粘贴一列测量值，自动分箱绘制直方图，叠加正态拟合曲线；填入规格限还能直接看出超差尾部。', 'Paste a column of measurements for an auto-binned histogram with a fitted normal curve; add spec limits to see out-of-spec tails.'),
    desc: B('免费在线直方图制作器：自动分箱、正态拟合曲线、可选 USL/LSL 规格限、可调分箱数，导出矢量 SVG/PNG。看分布形态、偏态与 outliers。', 'Free online histogram maker: automatic binning, fitted normal curve, optional USL/LSL, adjustable bin count, vector export. Inspect shape, skew and outliers.'),
    about: [
      B('直方图把连续测量值切成若干等宽区间（bin），用柱高表示落在每个区间的样本数，是判断分布形态最直接的图：是否近似正态、是否偏态、是否双峰（暗示混了两批料/两台设备）、有没有离群值。', 'A histogram bins continuous measurements into equal-width intervals and shows the count in each — the fastest way to see distribution shape: near-normal, skewed, bimodal (often two lots or two machines mixed), or with outliers.'),
      B('分箱数默认用 √n 规则，也可手动调整：箱太少会掩盖双峰，箱太多会让噪声冒充结构。叠加正态曲线可以直观对照理论分布；若再加 USL/LSL，就退化成一张过程能力图（可跳转到专用计算器）。', 'Bin count defaults to the √n rule and is adjustable: too few bins hide bimodality, too many make noise look like structure. A fitted normal curve gives a theoretical reference; adding USL/LSL turns it into a capability view (see the dedicated calculator).'),
    ],
    features: [B('自动分箱 + 正态拟合曲线，分箱数可手动微调。', 'Automatic binning + fitted normal curve, with a manual bin-count override.'), B('可填 USL/LSL 规格限，直接看超差尾部。', 'Optional USL/LSL lines reveal out-of-spec tails.'), F_SVG, F_FREE],
    faq: [
      F('分箱数怎么选？', 'How many bins should I use?',
        '默认 √n 是通用起点。样本少于 30 用 5–7 箱，几百个点可用 15–25 箱。多试几档，看形态结论是否稳健。', '√n is a good default. Use 5–7 bins below ~30 points, 15–25 for a few hundred. Try a couple of values and check whether your conclusion holds.'),
      F('直方图和柱状图有什么区别？', 'Histogram vs bar chart — what is the difference?',
        '直方图的 X 轴是连续数值区间、柱子通常相邻无间隙，表示分布；柱状图的 X 轴是离散类别、柱间有间隙，表示类别对比。', 'A histogram has a continuous numeric x-axis with adjacent bars (distribution); a bar chart has discrete categories with gaps (comparison).'),
      FAQ_DATA,
    ],
    mode: 'histogram', chartType: 'histogram', calc: 'histogram', fields: ['usl', 'lsl', 'bins'],
    related: ['process-capability-calculator', 'cpk-calculator', 'box-plot-maker', 'scatter-plot-maker'],
  },
  {
    slug: 'fishbone-diagram-maker', tier: 1, kw: 'Fishbone Diagram Maker', icon: 'Fb',
    category: B('质量工具', 'Quality Tools'),
    h1: B('鱼骨图制作器 — Fishbone / Ishikawa Diagram Maker', 'Fishbone Diagram Maker — Free Online Ishikawa / Cause-and-Effect'),
    lead: B('按 5M1E（人机料法环测）组织原因，填一个简单 JSON 或直接改示例，立刻生成可导出的矢量鱼骨图。', 'Organize causes by 5M1E (Man / Machine / Material / Method / Milieu / Measurement), edit a small JSON or the sample, and get an exportable vector fishbone.'),
    desc: B('免费在线鱼骨图 (Ishikawa / 特性要因图) 制作器：按人机料法环测分组原因指向单一结果，自绘矢量 SVG，导出 SVG/PNG，免注册。', 'Free online fishbone (Ishikawa / cause-and-effect) diagram maker: group causes by 5M1E into one effect, hand-drawn vector SVG, SVG/PNG export, no sign-up.'),
    about: [
      B('鱼骨图（石川馨提出，又称特性要因图）用于结构化的原因发散：右侧「鱼头」写待解决的问题（结果），向左伸出主骨，每条主骨是一个原因大类，大类下再挂具体原因。制造业常用 5M1E：人、机、料、法、环、测。', 'The fishbone (Ishikawa / cause-and-effect) diagram structures root-cause brainstorming: the "head" states the effect, the spine runs left, and each major bone is a cause category with sub-causes. Manufacturing uses 5M1E: Man, Machine, Material, Method, Milieu (environment), Measurement.'),
      B('它解决的是「想得全」，柏拉图解决的是「抓得准」——标准流程是先用鱼骨图发散并归类，再收集数据用柏拉图量化，锁定少数主因。本工具用 JSON 描述结构（effect + bones[{category, causes[]}]），所有连线由引擎自绘为精确矢量，不使用任何素材图片。', 'It covers "think comprehensively"; the Pareto chart covers "prioritize correctly". The standard flow: brainstorm and group with the fishbone, then quantify with a Pareto to isolate the few main causes. This tool describes the structure in JSON (effect + bones[{category, causes[]}]) and draws every connector as precise vector geometry — no stock images.'),
    ],
    features: [B('JSON 描述结构，改文字即重绘，适合评审会上现场迭代。', 'JSON-driven structure — edit the text and it redraws, ideal for live review sessions.'), B('连线与骨架全部为精确矢量自绘，放大不糊、可在 PPT 里继续改。', 'Every bone and connector is hand-built vector geometry — crisp at any zoom, editable in PowerPoint.'), F_SVG, F_FREE],
    faq: [
      F('5M1E 分别指什么？', 'What does 5M1E stand for?',
        '人 (Man)、机 (Machine)、料 (Material)、法 (Method)、环 (Milieu/Environment)、测 (Measurement)。服务业常换成 4P：人、流程、政策、场所。', 'Man, Machine, Material, Method, Milieu (Environment), Measurement. Service teams often use 4P: People, Process, Policy, Place.'),
      F('必须用 JSON 吗？', 'Do I have to write JSON?',
        '不用从零写——载入示例后直接改文字即可。结构是 { "effect": "…", "bones": [ { "category": "…", "causes": ["…"] } ] }。', 'No — load the sample and just edit the text. The shape is { "effect": "…", "bones": [ { "category": "…", "causes": ["…"] } ] }.'),
      FAQ_EXPORT,
    ],
    mode: 'fishbone', chartType: 'fishbone', calc: 'none', fields: [],
    related: ['pareto-chart-maker', 'control-chart-maker', 'gage-rr-calculator', 'free-spc-software'],
  },
  {
    slug: 'gage-rr-calculator', tier: 1, kw: 'Gage R&R Calculator', icon: 'GR',
    category: B('测量系统', 'Measurement Systems'),
    h1: B('Gage R&R 计算器 — 量具重复性与再现性在线分析', 'Gage R&R Calculator — Free Online MSA (AIAG X̄-R Method)'),
    lead: B('粘贴「操作员, 零件, 测量值」三列，自动用 X̄-R 法算出 EV / AV / GRR / PV、%研究变异、ndc 与 AIAG 判定。', 'Paste operator / part / measurement columns to compute EV, AV, GRR, PV, %Study Variation, ndc and the AIAG verdict via the X̄-R method.'),
    desc: B('免费在线 Gage R&R 计算器：AIAG 交叉型 X̄-R 法，输出重复性 EV、再现性 AV、%GRR、%PV、ndc（可区分类别数）与合格判定，导出矢量分析图。', 'Free online Gage R&R calculator using the AIAG crossed X̄-R method: EV, AV, %GRR, %PV, ndc and an accept/marginal/reject verdict, with an exportable vector study chart.'),
    about: [
      B('Gage R&R（量具重复性与再现性，MSA 核心）回答的是：测量数据里的波动，有多少来自量具/测量系统，而不是真实零件差异？重复性 EV 是同一操作员反复测同一零件的波动；再现性 AV 是不同操作员之间的偏差；零件变差 PV 才是真实的产品差异。', 'Gage R&R (the core of MSA) asks: how much of the variation in my data comes from the measurement system rather than real part-to-part differences? Repeatability (EV) is the variation when one operator re-measures one part; reproducibility (AV) is the bias between operators; part variation (PV) is the real product spread.'),
      B('AIAG 判定：%GRR < 10% 可接受，10–30% 视应用可接受（需说明），> 30% 不可接受；ndc（可区分类别数）应 ≥ 5。本工具用经典 X̄-R 法（极差法）估计，输入为三列长表：操作员、零件、测量值，每个「操作员×零件」组合应有重复测量。', 'AIAG thresholds: %GRR < 10% acceptable, 10–30% conditionally acceptable, > 30% unacceptable; ndc (number of distinct categories) should be ≥ 5. This tool uses the classic X̄-R (range) method on a three-column long table — operator, part, measurement — with repeats per operator×part cell.'),
    ],
    features: [B('一次输出 EV / AV / GRR / PV、%研究变异与 ndc，不用手算方差分量。', 'Computes EV / AV / GRR / PV, %Study Variation and ndc together — no manual variance components.'), B('按 AIAG 阈值自动给出「可接受 / 有条件 / 不可接受」判定。', 'Automatic AIAG accept / marginal / reject verdict.'), F_SVG, F_FREE],
    faq: [
      F('%GRR 多少算合格？', 'What %GRR is acceptable?',
        'AIAG：< 10% 可接受；10–30% 可能可接受（取决于特性重要性与成本，需说明理由）；> 30% 需改进测量系统。同时看 ndc ≥ 5。', 'AIAG: < 10% acceptable; 10–30% may be acceptable depending on criticality and cost (document the rationale); > 30% requires improvement. Also check ndc ≥ 5.'),
      F('数据要怎么排？', 'How should I format the data?',
        '三列：操作员、零件、测量值，每行为一次测量。例如 3 名操作员 × 5 个零件 × 2 次重复 = 30 行。', 'Three columns: operator, part, measurement, one row per reading. E.g. 3 operators × 5 parts × 2 repeats = 30 rows.'),
      FAQ_DATA,
    ],
    mode: 'msa', chartType: 'msa', calc: 'gageRR', fields: [],
    related: ['process-capability-calculator', 'control-chart-maker', 'fishbone-diagram-maker', 'free-spc-software'],
  },
  {
    slug: 'free-spc-software', tier: 1, kw: 'SPC Software Free', icon: 'SP',
    category: B('SPC 套件', 'SPC Suite'),
    h1: B('免费 SPC 软件 — 打开浏览器就能用的统计过程控制工具', 'Free SPC Software — Statistical Process Control in Your Browser'),
    lead: B('不用装 Minitab、不用买授权、不用注册：20 个 SPC / 质量工具全部免费在线，本地计算、导出编辑级矢量图。', 'No Minitab install, no license, no sign-up: 20 free SPC & quality tools that compute locally and export editorial-grade vector charts.'),
    desc: B('免费在线 SPC 软件套件：控制图、Cpk/过程能力、X̄-R / I-MR、p/np/c/u 图、Gage R&R、柏拉图、鱼骨图、判异判定器。免安装免注册，数据不上传，导出矢量 SVG/PNG。', 'Free online SPC software suite: control charts, Cpk / capability, X̄-R / I-MR, p/np/c/u charts, Gage R&R, Pareto, fishbone and rule checkers. No install, no sign-up, client-side, vector export.'),
    about: [
      B('传统 SPC 软件（Minitab、QI Macros、JMP）功能完整，但要装、要买授权、图也不好直接进汇报。ChartForge 走的是另一条路：把统计过程控制里最高频的 20 个任务拆成一个个独立网页工具，每个都能打开即用、贴数据即出结果。', 'Traditional SPC packages (Minitab, QI Macros, JMP) are complete but require installation, licenses, and their charts rarely drop into a slide cleanly. ChartForge takes another route: split the 20 most common SPC jobs into standalone browser tools — each opens instantly and turns pasted data into a result.'),
      B('为什么敢免费：所有计算都跑在你的浏览器里（纯前端 SVG 引擎），我们不承担服务器算力，也不碰你的数据。付费只用于去署名、私有项目、团队协作与品牌主题等「组织级」需求。学生、工程师、审核员、小团队可以零成本长期使用。', 'Why free is sustainable: every calculation runs in your browser (a pure client-side SVG engine), so we carry no server compute and never touch your data. Paid tiers cover organizational needs — removing attribution, private projects, collaboration and brand themes. Students, engineers, auditors and small teams can stay on the free tier indefinitely.'),
    ],
    features: [B('20 个工具覆盖控制图、能力分析、MSA、QC 七大工具与判异准则。', '20 tools covering control charts, capability, MSA, the seven QC tools and rule checkers.'), F_FREE, F_SVG, B('输出可签字归档的 SPC 报告（I-MR + 能力直方图 + 白话诊断）。', 'Generate sign-off-ready SPC reports (I-MR + capability histogram + plain-language diagnosis).')],
    faq: [
      F('和 Minitab 相比缺什么？', 'What is missing compared to Minitab?',
        '我们不覆盖 DOE、可靠性、多元统计等重型模块；聚焦「日常 SPC 出图 + 算指标 + 交报告」这一段最高频的工作。需要重型建模时 Minitab 仍是更好的选择。', 'We do not cover DOE, reliability or multivariate modeling; we focus on the highest-frequency job: routine SPC charting, metrics and reports. For heavy modeling, Minitab remains the better fit.'),
      FAQ_FREE,
      FAQ_DATA,
    ],
    mode: 'hub', chartType: 'control', calc: 'control', fields: [],
    related: ['control-chart-maker', 'cpk-calculator', 'xbar-r-chart', 'gage-rr-calculator', 'minitab-alternative'],
  },

  // ============================ Tier 2：长尾组合 ============================
  {
    slug: 'p-chart', tier: 2, kw: 'p Chart', icon: 'p',
    category: B('属性控制图', 'Attribute Charts'),
    h1: B('p 控制图（p Chart）在线生成器 — 可变样本量的不良率', 'p Chart Maker — Free Online Proportion Nonconforming (Variable n)'),
    lead: B('输入每批的不良数与样本量，自动算 pbar 与逐点 3σ 控制限；样本量不同时，控制限会自动随 n 变化。', 'Enter defectives and sample sizes to compute pbar and point-wise 3σ limits that widen or narrow as n changes.'),
    desc: B('免费在线 p 控制图生成器：不良率 p = d/n，控制限随样本量变化，自动标注越限点。比 np 图更适合每批抽检数量不一致的场景。导出矢量 SVG/PNG。', 'Free online p chart maker: proportion nonconforming p = d/n with limits that vary by subgroup size and flagged out-of-control points. Use when inspected quantities differ. Vector export.'),
    about: [
      B('p 图监控「不合格品比例」，服从二项分布。中心线 pbar = Σd / Σn，每点的标准差 √(pbar(1−pbar)/nᵢ)，控制限 pbar ± 3·se。因为 se 含 nᵢ，所以当各批样本量不同时，p 图的控制限是阶梯状而非两条平直线——这正是 p 图与 np 图最关键的区别。', 'A p chart monitors the proportion nonconforming (binomial). Center line pbar = Σd / Σn; each point has se = √(pbar(1−pbar)/nᵢ) and limits pbar ± 3·se. Because se depends on nᵢ, unequal subgroup sizes produce stepped rather than flat limits — the key difference from the np chart.'),
      B('使用前提：各点判定为合格/不合格（go-no-go），且样本量足够大（经验上 np ≥ 5）。若样本量恒定，np 图更直观（直接画不良数）；若统计的是「缺陷个数」而非「不合格品数」，应改用 c 图或 u 图。', 'Use when each unit is classified conforming/nonconforming and samples are large enough (rule of thumb np ≥ 5). With constant n, the np chart is more intuitive (raw counts). If you count defects rather than defective units, use c or u instead.'),
    ],
    features: [B('控制限随样本量逐点变化，阶梯状上限/下限自动绘制。', 'Point-wise limits that step with subgroup size, drawn automatically.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('p 图和 np 图选哪个？', 'p chart or np chart?',
        '样本量恒定用 np 图（画不良数，更好读）；样本量变化必须用 p 图（画不良率，控制限随 n 变）。', 'Constant subgroup size → np chart (raw defectives, easier to read). Varying size → p chart (proportion, limits vary with n).'),
      F('p 图和 u 图有什么区别？', 'What is the difference between a p chart and a u chart?',
        'p/np 统计「不合格品数」（每项非黑即白，二项分布）；c/u 统计「缺陷数」（一个产品可有多个缺陷，泊松分布）。', 'p/np count nonconforming units (binary, binomial); c/u count defects (one unit can have several, Poisson).'),
      FAQ_DATA,
    ],
    mode: 'p', chartType: 'p', calc: 'p', fields: [],
    related: ['np-chart', 'c-chart', 'u-chart', 'control-chart-maker'],
  },
  {
    slug: 'np-chart', tier: 2, kw: 'np Chart', icon: 'np',
    category: B('属性控制图', 'Attribute Charts'),
    h1: B('np 控制图（np Chart）在线生成器 — 恒定样本量的不良数', 'np Chart Maker — Free Online Number Nonconforming (Constant n)'),
    lead: B('每批抽检数量相同时，直接画不良数：中心线 n·pbar，控制限平直流畅，比 p 图更容易向现场解释。', 'When inspection quantity is constant, plot raw defectives: center line n·pbar with straight, flat limits — easier to explain on the shop floor than a p chart.'),
    desc: B('免费在线 np 控制图生成器：恒定样本量下监控不合格品数，自动算 n·pbar 与 3σ 控制限并标注越限点。导出矢量 SVG/PNG。', 'Free online np chart maker: monitor the number nonconforming with constant subgroup size, with n·pbar center line, 3σ limits and flagged points. Vector export.'),
    about: [
      B('np 图是 p 图在样本量恒定时的等价形式：画的是不良「个数」d 而不是比例 p = d/n。中心线 npbar，控制限 npbar ± 3√(npbar(1−pbar))。因为 n 固定，上下限是两条水平直线，现场班组更容易读。', 'The np chart is the constant-n form of the p chart: it plots the count d rather than the proportion p = d/n. Center line npbar, limits npbar ± 3√(npbar(1−pbar)). With fixed n, the limits are two horizontal lines — much easier to read on the shop floor.'),
      B('选择规则很干脆：n 相同 → np；n 不同 → p。如果同一件产品上可能发现多个缺陷（如一块板上的焊点缺陷数），那就不是「不合格品」而是「缺陷」，应改用 c 图（样本量恒定）或 u 图（样本量变化）。', 'The rule is simple: same n → np; differing n → p. If one unit can carry several defects (e.g. solder defects per board), you are counting defects, not defective units — use c (constant area) or u (varying area).'),
    ],
    features: [B('平直流畅的控制限，适合打印张贴在看板上。', 'Flat limits that print cleanly on a shop-floor board.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('np 图要求样本量完全一样吗？', 'Must subgroup sizes be exactly equal for an np chart?',
        '是。否则控制限会随 n 变化，np 图就不再适用，应改用 p 图。若样本量只有微小波动（< ±5%），工程上有时仍近似使用，但需说明。', 'Yes. Otherwise limits vary with n and you should switch to a p chart. Small fluctuations (< ±5%) are sometimes tolerated with a documented approximation.'),
      F('npbar 太小怎么办？', 'What if npbar is very small?',
        '若 npbar < 5，二项分布明显偏态，3σ 对称限不可靠。应增大样本量，或改用基于精确二项分位数的控制限。', 'If npbar < 5 the binomial is badly skewed and symmetric 3σ limits are unreliable. Increase the sample size or use exact binomial-quantile limits.'),
      FAQ_EXPORT,
    ],
    mode: 'np', chartType: 'np', calc: 'np', fields: [],
    related: ['p-chart', 'c-chart', 'u-chart', 'xbar-r-chart'],
  },
  {
    slug: 'c-chart', tier: 2, kw: 'c Chart', icon: 'c',
    category: B('属性控制图', 'Attribute Charts'),
    h1: B('c 控制图（c Chart）在线生成器 — 恒定检验单位的缺陷数', 'c Chart Maker — Free Online Defect Count (Constant Area of Opportunity)'),
    lead: B('监控每个固定检验单位内的缺陷总数（泊松计数），自动算 cbar 与上下控制限并标注异常批次。', 'Monitor total defects per fixed inspection unit (Poisson counts) with an auto cbar, 3σ limits and flagged batches.'),
    desc: B('免费在线 c 控制图生成器：泊松缺陷数，中心线 cbar，控制限 cbar ± 3√cbar，自动标注越限点。适用于每批检验面积/长度/数量恒定的场景。导出矢量图。', 'Free online c chart maker: Poisson defect counts with center cbar and limits cbar ± 3√cbar, flagged points. For a constant area of opportunity. Vector export.'),
    about: [
      B('c 图统计的是「缺陷个数」而非「不合格品个数」——一个产品上可以同时有多个缺陷（划痕、气泡、虚焊点各算各的）。它假设缺陷随机、独立、稀有，服从泊松分布，因此方差等于均值 cbar，控制限就是 cbar ± 3√cbar。', 'A c chart counts defects, not defective units — one product may carry several (scratches, bubbles, cold joints counted separately). Defects are assumed random, independent and rare (Poisson), so variance equals the mean cbar and limits are cbar ± 3√cbar.'),
      B('关键前提：每次的「机会区域」必须相同——同样的面积、长度、时间窗或台数。若每批检验量不同，就不能直接比缺陷数，必须改用 u 图（单位缺陷数）。若统计的是合格/不合格的二分类，则回到 p / np 图。', 'The key assumption: a constant area of opportunity — same area, length, time window or unit count. If inspection volume varies, raw counts are not comparable; use the u chart (defects per unit). For binary conforming/nonconforming data, go back to p / np.'),
    ],
    features: [B('泊松口径自动算 cbar 与 3σ 控制限，越限批次高亮。', 'Poisson-based cbar and 3σ limits with out-of-control batches highlighted.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('c 图和 u 图怎么选？', 'c chart or u chart?',
        '每批检验量（面积/长度/数量）相同 → c 图直接画缺陷数；不同 → u 图画单位缺陷数 c/n，控制限随 n 变化。', 'Constant inspection volume → c chart (raw count). Varying volume → u chart (defects per unit c/n) with limits varying by n.'),
      F('cbar 很小时还能用 3σ 限吗？', 'Can I use 3σ limits when cbar is small?',
        'cbar < 5 时泊松分布明显右偏，对称 3σ 限会导致误报偏多。建议扩大检验单位，或改用精确泊松分位数控制限。', 'Below cbar ≈ 5 the Poisson is strongly right-skewed and symmetric 3σ limits over-signal. Enlarge the inspection unit or use exact Poisson-quantile limits.'),
      FAQ_DATA,
    ],
    mode: 'c', chartType: 'c', calc: 'c', fields: [],
    related: ['u-chart', 'p-chart', 'np-chart', 'control-chart-maker'],
  },
  {
    slug: 'u-chart', tier: 2, kw: 'u Chart', icon: 'u',
    category: B('属性控制图', 'Attribute Charts'),
    h1: B('u 控制图（u Chart）在线生成器 — 可变检验单位的缺陷率', 'u Chart Maker — Free Online Defects Per Unit (Variable Area)'),
    lead: B('每批检验量不同时，用「单位缺陷数」u = c/n 作比较，控制限自动随检验量变化。', 'When inspection volume differs, compare defects per unit u = c/n with limits that automatically adapt to each area of opportunity.'),
    desc: B('免费在线 u 控制图生成器：单位缺陷数 u = c/n，控制限 ubar ± 3√(ubar/n) 随样本量变化，自动标注越限点。导出矢量 SVG/PNG。', 'Free online u chart maker: defects per unit u = c/n with limits ubar ± 3√(ubar/n) that vary by subgroup size, flagged points, vector export.'),
    about: [
      B('u 图是 c 图在「机会区域可变」时的推广：不比缺陷总数，而比单位缺陷数 uᵢ = cᵢ / nᵢ。中心线 ubar = Σc / Σn，逐点控制限 ubar ± 3√(ubar / nᵢ)。检验量大时带宽收窄，检验量小时带宽放大——这让不同规模的批次可以放在同一张图上公平比较。', 'The u chart generalizes the c chart to a varying area of opportunity: it compares defects per unit uᵢ = cᵢ / nᵢ rather than raw counts. Center ubar = Σc / Σn; point-wise limits ubar ± 3√(ubar / nᵢ). Larger inspection volumes get narrower bands, smaller ones wider — so differently sized batches are comparable on one chart.'),
      B('四张属性控制图的选择可以记成一张 2×2 表：行是「不合格品数（二项）」还是「缺陷数（泊松）」，列是「样本/机会区域恒定」还是「变化」——二项+恒定 = np，二项+变化 = p，泊松+恒定 = c，泊松+变化 = u。', 'The four attribute charts form a 2×2 grid: rows = nonconforming units (binomial) vs defects (Poisson); columns = constant vs varying opportunity. Binomial+constant = np, binomial+varying = p, Poisson+constant = c, Poisson+varying = u.'),
    ],
    features: [B('逐点控制限随检验量自动收放，不同规模批次可同图比较。', 'Point-wise limits adapt to inspection volume so mixed-size batches stay comparable.'), F_STAT, F_SVG, F_FREE],
    faq: [
      F('u 图和 p 图都是「率」，区别在哪？', 'Both u and p are rates — what is the difference?',
        'p 的分母是「被判定的件数」，分子是其中不合格的件数（≤ 分母）；u 的分母是检验单位量，分子是缺陷数，可以大于分母（一件上多个缺陷）。', 'For p, the denominator is units judged and the numerator is nonconforming units (≤ denominator). For u, the denominator is inspection units and the numerator is defects, which may exceed it (multiple defects per unit).'),
      F('ubar 太小怎么办？', 'What if ubar is small?',
        '与 c 图同理：稀有事件下泊松偏态明显，3σ 对称限误报偏多。建议增大检验单位或用精确泊松限。', 'As with the c chart, rare events make the Poisson skewed and symmetric 3σ limits over-signal. Enlarge the unit or use exact Poisson limits.'),
      FAQ_EXPORT,
    ],
    mode: 'u', chartType: 'u', calc: 'u', fields: [],
    related: ['c-chart', 'p-chart', 'np-chart', 'control-chart-maker'],
  },
  {
    slug: 'western-electric-rules', tier: 2, kw: 'Western Electric Rules', icon: 'WE',
    category: B('判异准则', 'Rule Checkers'),
    h1: B('Western Electric 判异准则检查器 — 在线逐点检测', 'Western Electric Rules Checker — Free Online Point-by-Point Test'),
    lead: B('粘贴一列过程数据，逐点运行 WECO 四条基本判异规则，列出每条规则命中了哪些点，并在控制图上高亮。', 'Paste a process series to run all four WECO basic rules point by point, see exactly which points each rule flags, and view them highlighted on the chart.'),
    desc: B('免费在线 Western Electric (WECO) 判异准则检查器：逐点检测超出 3σ、2/3 超 2σ、4/5 超 1σ、连续 8 点同侧，输出命中点表与控制图。', 'Free online Western Electric rule checker: tests 1-beyond-3σ, 2-of-3-beyond-2σ, 4-of-5-beyond-1σ and 8-on-one-side, with a hit table and highlighted control chart.'),
    about: [
      B('Western Electric（1956 年《Statistical Quality Control Handbook》）提出的一组判异准则，目的是在「点还没越出 3σ」时就捕捉到非随机模式。四条基本规则：① 任一点超出 3σ；② 连续 3 点中至少 2 点落在同侧 2σ 以外；③ 连续 5 点中至少 4 点落在同侧 1σ 以外；④ 连续 8 点落在中心线同侧。', 'Published by Western Electric in the 1956 Statistical Quality Control Handbook, these rules catch non-random patterns before any point crosses 3σ. The four basic rules: ① any point beyond 3σ; ② 2 of 3 consecutive beyond 2σ on one side; ③ 4 of 5 consecutive beyond 1σ on one side; ④ 8 consecutive points on one side of the center line.'),
      B('把控制图按 σ 分成 C 区（±1σ）、B 区（1–2σ）、A 区（2–3σ）就能直观理解：规则越靠后，越是在检测「小幅但持续」的偏移。本工具用与图上控制限完全一致的口径（CL = 均值，σ = 样本标准差）逐点扫描，返回每条规则命中的点序号，便于回查对应班次/批次。', 'Dividing the chart into Zone C (±1σ), B (1–2σ) and A (2–3σ) makes it intuitive: later rules detect smaller but sustained shifts. This tool scans point by point using exactly the same CL / σ as the rendered chart, and returns the hit indices for each rule so you can trace back to the shift or lot.'),
    ],
    features: [B('四条规则全部真实逐点计算，返回命中点序号，不是文字说明。', 'All four rules are actually computed point by point, returning hit indices — not just a description.'), B('判定口径与同页控制图的 CL/UCL/LCL 严格一致，图与结论不会打架。', 'Verdict uses the exact CL/UCL/LCL of the chart shown alongside, so the picture and the conclusion agree.'), F_STAT, F_FREE],
    faq: [
      F('WECO 规则和 Nelson 规则有什么关系？', 'How do WECO rules relate to Nelson rules?',
        'Nelson 8 条是 WECO 的扩展与重编号：N1/N5/N6 对应 WE1/WE2/WE3，N2 把「连续 8 点同侧」改为 9 点，另增趋势、交替、分层等规则。', 'Nelson’s 8 rules extend and renumber WECO: N1/N5/N6 map to WE1/WE2/WE3, N2 uses 9 instead of 8 consecutive points, and adds trend, alternation and stratification tests.'),
      F('命中规则就一定失控吗？', 'Does a rule hit always mean out of control?',
        '不是自动结论，而是「值得调查的信号」。规则越多、误报率越高，应结合过程知识确认是否为特殊原因，避免把普通原因当异常过度调整。', 'Not automatically — a hit is a signal worth investigating, not a verdict. More rules mean more false alarms; confirm against process knowledge before adjusting (over-adjustment is itself a special cause).'),
      FAQ_DATA,
    ],
    mode: 'rules-western', chartType: 'control', calc: 'rules', fields: [],
    related: ['nelson-rules', 'control-chart-maker', 'imr-chart', 'run-chart-maker'],
    // 演示数据含一个越限点与一段连续上升趋势，打开即能看到判异命中（见 seoCalc 计算）
    sampleOverride: `测量值\n10.02\n10.06\n9.92\n9.83\n10.14\n10.09\n10.11\n10.14\n10.06\n10.07\n10.13\n9.92\n10.10\n10.16\n10.22\n10.28\n10.34\n10.40\n10.95\n9.40\n10.02\n9.96`,
  },
  {
    slug: 'nelson-rules', tier: 2, kw: 'Nelson Rules', icon: 'NR',
    category: B('判异准则', 'Rule Checkers'),
    h1: B('Nelson 判异准则检查器 — 8 条规则在线逐点检测', 'Nelson Rules Checker — Free Online 8-Rule SPC Test'),
    lead: B('一次跑完 Nelson 8 条判异规则（越限、偏移、趋势、交替、分层、混合），列出每条规则的命中点并高亮到控制图。', 'Run all eight Nelson rules at once (limits, shift, trend, alternation, stratification, mixture), list the hits per rule and highlight them on the chart.'),
    desc: B('免费在线 Nelson 8 条判异规则检查器：逐点检测 N1–N8，输出命中点序号、CL/UCL/LCL 与高亮控制图。对齐 AIAG / Western Electric 口径。', 'Free online Nelson rules checker: point-by-point N1–N8 detection with hit indices, CL/UCL/LCL and a highlighted control chart. Aligned with AIAG / Western Electric conventions.'),
    about: [
      B('Nelson（1984）把控制图判异整理成 8 条：N1 单点超 3σ；N2 连续 9 点同侧；N3 连续 6 点持续升降；N4 连续 14 点上下交替；N5 3 点中 2 点超同侧 2σ；N6 5 点中 4 点超同侧 1σ；N7 连续 15 点全在 ±1σ 内（变异异常小，常是分层或数据被修饰）；N8 连续 8 点全在 ±1σ 外（双峰/混合，变异异常大）。', 'Nelson (1984) codified eight tests: N1 one point beyond 3σ; N2 nine consecutive on one side; N3 six steadily increasing/decreasing; N4 fourteen alternating up/down; N5 2 of 3 beyond 2σ; N6 4 of 5 beyond 1σ; N7 fifteen consecutive within ±1σ (unusually low variation — stratification or rounded data); N8 eight consecutive with none within ±1σ (bimodal / mixed, unusually high variation).'),
      B('N7 与 N8 最容易被忽略却很有价值：它们检测的不是「点跑出去了」，而是「点的分布形态不对」——前者提示控制限可能算宽了或数据被分组平均过，后者提示把两台设备/两批料的数据混在了一起。本工具全部 8 条真实逐点计算，并给出命中点序号方便回溯。', 'N7 and N8 are the most overlooked yet valuable: they detect wrong distribution shape rather than excursions — N7 hints at overly wide limits or averaged/stratified data, N8 at mixing two machines or two lots. This tool computes all eight point by point and reports hit indices for traceability.'),
    ],
    features: [B('8 条规则全部真实计算，含常被漏掉的分层 N7 与混合 N8。', 'All eight rules computed, including the frequently missed stratification (N7) and mixture (N8) tests.'), B('逐条列出命中点序号与规则解释，便于写进异常报告。', 'Per-rule hit indices and explanations, ready to paste into an anomaly report.'), F_STAT, F_FREE],
    faq: [
      F('N7「变异太小」也算异常？', 'Is "too little variation" (N7) really a signal?',
        '是。它常意味着子组分层（把不同来源的数据平均了）、数据被四舍五入/修饰，或控制限被高估。过程看起来「太乖」同样值得查。', 'Yes. It often means stratified subgroups (averaging different sources), rounded/edited data, or overestimated limits. A process that looks "too well behaved" deserves a check too.'),
      F('一次启用 8 条规则会不会误报太多？', 'Will eight rules cause too many false alarms?',
        '会。规则越多，整体误报率越高（多重比较）。建议先按 N1/N2/N3 监控，其余作为调查线索，并结合过程知识判断。', 'Yes — more rules mean a higher overall false-alarm rate (multiple comparisons). Monitor on N1/N2/N3 first and treat the rest as investigative hints combined with process knowledge.'),
      FAQ_DATA,
    ],
    mode: 'rules-nelson', chartType: 'control', calc: 'rules', fields: [],
    related: ['western-electric-rules', 'control-chart-maker', 'imr-chart', 'run-chart-maker'],
    sampleOverride: `测量值\n10.02\n10.06\n9.92\n9.83\n10.14\n10.09\n10.11\n10.14\n10.06\n10.07\n10.13\n9.92\n10.10\n10.16\n10.22\n10.28\n10.34\n10.40\n10.95\n9.40\n10.02\n9.96`,
  },
  {
    slug: 'run-chart-maker', tier: 2, kw: 'Run Chart Maker', icon: 'Ru',
    category: B('控制图', 'Control Charts'),
    h1: B('运行图制作器 — Run Chart Maker（趋势与漂移检测）', 'Run Chart Maker — Free Online Trend & Shift Detection'),
    lead: B('按时间顺序画数据点 + 中位数参考线，自动检测连续同侧（漂移）与连续升降（趋势）等非随机信号。', 'Plot time-ordered data against a median reference line and auto-detect non-random signals such as shifts and trends.'),
    desc: B('免费在线运行图 (run chart) 制作器：中位数参考线 + 漂移/趋势非随机信号检测，适用于改进项目前后对比与过程初步诊断。导出矢量 SVG/PNG。', 'Free online run chart maker: median reference line plus shift/trend non-random-signal detection. Ideal for before/after improvement studies and first-pass process diagnosis. Vector export.'),
    about: [
      B('运行图是控制图的轻量前身：只画按时间顺序的观测值与一条中位数线，不计算 3σ 控制限。它遵循 IHI（美国医疗改进研究所）常用的规则——连续 ≥ 6 点全在中位数同侧为「漂移 (shift)」，连续 ≥ 5 点单调上升或下降为「趋势 (trend)」，以及点数过少/过多交叉提示非随机。', 'A run chart is the lightweight precursor to a control chart: time-ordered observations plus a median line, without 3σ limits. It follows IHI-style rules — ≥ 6 consecutive points on one side of the median = shift, ≥ 5 steadily increasing/decreasing = trend, plus too few/many crossings as non-random evidence.'),
      B('什么时候用它：数据点太少（< 20）还不够算稳定控制限时；或做质量改进项目，想直观展示「干预前后中位数是否真的移动了」。等样本充足、需要严格区分普通/特殊原因时，再升级到 I-MR 或 X̄-R 控制图。', 'Use it when you have too few points (< ~20) for reliable limits, or when showing whether an improvement intervention actually moved the median. Once you have enough data and need to separate common from special causes, graduate to I-MR or X̄-R.'),
    ],
    features: [B('中位数参考线 + 漂移/趋势信号自动标注，改进前后对比一目了然。', 'Median line with automatic shift/trend flags makes before/after comparisons obvious.'), B('样本量少也能用，是控制图之前的合适起点。', 'Works with small samples — the right starting point before a full control chart.'), F_SVG, F_FREE],
    faq: [
      F('运行图和控制图的区别？', 'Run chart vs control chart?',
        '运行图用中位数作参考线、只检测非随机模式，不需要足够样本来估计 σ；控制图用均值 ± 3σ 控制限，能更严格地区分普通原因与特殊原因。', 'A run chart uses the median and detects non-random patterns without needing enough data to estimate σ; a control chart uses mean ± 3σ limits and separates common/special causes more rigorously.'),
      F('为什么用中位数而不是均值？', 'Why the median instead of the mean?',
        '中位数对离群值不敏感，且「一半点在上、一半点在下」的假设让游程/同侧检验更稳健，尤其适合小样本与偏态数据。', 'The median is robust to outliers, and the "half above / half below" property makes run/shift tests more reliable for small or skewed samples.'),
      FAQ_EXPORT,
    ],
    mode: 'run', chartType: 'run', calc: 'run', fields: [],
    related: ['control-chart-maker', 'imr-chart', 'western-electric-rules', 'nelson-rules'],
  },
  {
    slug: 'scatter-plot-maker', tier: 2, kw: 'Scatter Plot Maker', icon: 'Sc',
    category: B('统计分析', 'Statistics'),
    h1: B('散点图制作器 — Scatter Plot Maker（含回归线与相关系数）', 'Scatter Plot Maker — Free Online with Regression Line & r'),
    lead: B('输入两列数值，自动绘制散点、拟合线性回归线，并给出斜率、截距与 Pearson 相关系数 r / R²。', 'Enter two numeric columns to plot points, fit a linear regression line, and report slope, intercept and Pearson r / R².'),
    desc: B('免费在线散点图制作器：两变量相关性分析，自动线性回归拟合、相关系数 r 与 R²，可选趋势线与置信带，导出矢量 SVG/PNG。', 'Free online scatter plot maker: two-variable correlation with linear regression, Pearson r and R², optional trend line and confidence band, vector export.'),
    about: [
      B('散点图用于判断两个数值变量之间是否存在关系：点在图上是否沿某条线聚集、是正向还是负向、有无曲线形态、有没有拉高相关系数的离群点。ChartForge 会自动做最小二乘线性回归，叠加拟合线，并给出斜率、截距、Pearson r 与 R²。', 'A scatter plot reveals whether two numeric variables are related: do points cluster along a line, is the direction positive or negative, is the shape curved, are there outliers inflating r? ChartForge fits an ordinary least-squares line and reports slope, intercept, Pearson r and R².'),
      B('务必记住「相关不等于因果」：R² 高只说明线性关联强，不证明 X 导致 Y；也可能两者都被第三个变量驱动。在质量场景里，散点图常用来验证鱼骨图里猜的原因（如湿度 vs 虚焊率）是否真的与结果同变，再决定要不要做试验确认。', 'Remember: correlation is not causation. A high R² shows a strong linear association, not that X causes Y — a third variable may drive both. In quality work, scatter plots test whether a suspected cause from the fishbone (e.g. humidity vs solder defects) actually co-varies with the effect before committing to an experiment.'),
    ],
    features: [B('自动线性回归拟合，给出斜率、截距、r 与 R²。', 'Automatic OLS regression with slope, intercept, r and R².'), B('可选趋势线与置信带，相关性判断更有依据。', 'Optional trend line and confidence band for a better-grounded read.'), F_SVG, F_FREE],
    faq: [
      F('R² 多高才算有关系？', 'How high must R² be to count as a relationship?',
        '没有统一阈值，取决于领域。工程物理关系常 > 0.8；含人为因素的社会/业务数据 0.3 也可能重要。始终看图与领域知识，别只看数字。', 'No universal threshold — it depends on the domain. Physical engineering relations often exceed 0.8; human/business data at 0.3 can still matter. Always read the plot and domain knowledge, not just the number.'),
      F('能画非线性关系吗？', 'Can it show non-linear relationships?',
        '默认线性拟合；若散点明显呈曲线，可在 Studio 里切换二次趋势或改用分组/分面观察，避免用一条直线掩盖真实形态。', 'The default fit is linear; if the cloud is clearly curved, switch to a quadratic trend in Studio or stratify the data rather than hiding the shape behind one straight line.'),
      FAQ_DATA,
    ],
    mode: 'scatter', chartType: 'scatter', calc: 'scatter', fields: [],
    related: ['histogram-maker', 'box-plot-maker', 'pareto-chart-maker', 'fishbone-diagram-maker'],
  },
  {
    slug: 'box-plot-maker', tier: 2, kw: 'Box Plot Maker', icon: 'Bx',
    category: B('统计分析', 'Statistics'),
    h1: B('箱线图制作器 — Box Plot Maker（含须线与离群点）', 'Box Plot Maker — Free Online Box-and-Whisker with Outliers'),
    lead: B('按分组对比分布：中位数、四分位距 IQR、Tukey 1.5·IQR 须线、离群点与均值点一次画全。', 'Compare distributions by group: median, IQR, Tukey 1.5×IQR whiskers, outliers and the mean in one view.'),
    desc: B('免费在线箱线图 (box plot / 盒须图) 制作器：按分组展示中位数、Q1/Q3、1.5·IQR 须线、离群点与均值，导出矢量 SVG/PNG。', 'Free online box plot maker: median, Q1/Q3, 1.5×IQR whiskers, outliers and mean by group, with vector SVG/PNG export.'),
    about: [
      B('箱线图（Tukey 提出）用五个数字概括一组数据：最小值、Q1、中位数、Q3、最大值，并额外把「超出 Q1−1.5·IQR 或 Q3+1.5·IQR」的点单独画成离群点。箱体高度是 IQR（中间 50% 数据的跨度），箱内的线是中位数。', 'The box plot (Tukey) summarizes a group with five numbers — min, Q1, median, Q3, max — and separately marks outliers beyond Q1 − 1.5·IQR or Q3 + 1.5·IQR. The box height is the IQR (the middle 50%) and the line inside is the median.'),
      B('它最擅长的是「多组并排比分布」：一眼看出哪组中位更高、哪组波动更大、哪组有离群值，而不像直方图那样在组数多时挤成一团。输入格式为两列「组别, 数值」的长表，同一组可以有任意多个观测。', 'It excels at comparing several groups side by side: you instantly see which has a higher median, wider spread, or outliers — without the clutter of overlaid histograms. Input is a two-column long table (group, value) with any number of observations per group.'),
    ],
    features: [B('Tukey 1.5·IQR 须线 + 离群点 + 均值点，标准口径齐全。', 'Tukey 1.5×IQR whiskers, outliers and mean marker — the full standard treatment.'), B('两列长表输入，多组并排对比分布最直观。', 'Two-column long table; side-by-side group comparison at a glance.'), F_SVG, F_FREE],
    faq: [
      F('离群点是怎么定义的？', 'How are outliers defined?',
        '落在 Q1 − 1.5·IQR 以下或 Q3 + 1.5·IQR 以上的点（Tukey  fences）。须线延伸到该范围内最远的实际数据点，而不是 1.5·IQR 的理论位置。', 'Points below Q1 − 1.5·IQR or above Q3 + 1.5·IQR (Tukey fences). Whiskers extend to the farthest real data point still inside the fence, not to the theoretical 1.5·IQR position.'),
      F('箱线图和小提琴图选哪个？', 'Box plot or violin plot?',
        '箱线图简洁、便于比较多组关键统计量；小提琴图额外显示密度形状（能看出双峰）。需要看形态时用小提琴图，需要读数与对比时用箱线图。', 'Box plots are compact and great for comparing key statistics; violin plots add density shape (revealing bimodality). Use a violin for shape, a box plot for readable numbers and comparison.'),
      FAQ_DATA,
    ],
    mode: 'boxplot', chartType: 'boxplot', calc: 'boxplot', fields: [],
    related: ['histogram-maker', 'scatter-plot-maker', 'process-capability-calculator', 'cpk-calculator'],
  },
  {
    slug: 'minitab-alternative', tier: 2, kw: 'Minitab Alternative', icon: 'MA',
    category: B('方案对比', 'Comparison'),
    h1: B('Minitab 替代方案 — 浏览器里免费做 SPC 与控制图', 'Minitab Alternative — Free SPC & Control Charts in Your Browser'),
    lead: B('如果你只需要控制图、Cpk/过程能力、Gage R&R 和 QC 七大工具，不必装软件、不必买授权——打开网页就能出可进 PPT 的矢量图。', 'If you only need control charts, Cpk / capability, Gage R&R and the seven QC tools, skip the install and the license — open a page and export slide-ready vector charts.'),
    desc: B('Minitab 免费在线替代方案对比：控制图、Cpk、X̄-R/I-MR、p/np/c/u、Gage R&R、柏拉图鱼骨图全部浏览器内完成，免安装免注册，导出编辑级矢量 SVG/PNG。', 'A free browser-based Minitab alternative: control charts, Cpk, X̄-R/I-MR, p/np/c/u, Gage R&R, Pareto and fishbone — no install, no sign-up, editorial-grade vector SVG/PNG export.'),
    about: [
      B('Minitab 是统计软件的黄金标准，覆盖 DOE、可靠性、多元分析等重型模块。但日常 SPC 工作里，绝大多数人反复做的其实只有几件事：画控制图、算 Cp/Cpk、做 Gage R&R、排柏拉图、写一份能签字的报告。为这几件事付整套授权、装客户端、再手工把图美化进 PPT，成本并不划算。', 'Minitab is the gold standard, covering DOE, reliability, multivariate analysis and more. But most day-to-day SPC work repeats just a handful of jobs: draw a control chart, compute Cp/Cpk, run Gage R&R, rank a Pareto, and write a sign-off-ready report. Paying for a full license, installing a desktop client, then manually beautifying charts into slides is poor value for that slice.'),
      B('ChartForge 的定位不是「取代 Minitab」，而是补上「轻量、零门槛、图能直接进汇报」这一段。我们诚实地划清边界：需要 DOE / 可靠性 / 复杂建模时，Minitab 仍是更合适的工具；需要快速、正确、好看且可导出的日常 SPC 出图时，这里更快。下面这张表把差异摊开讲。', 'ChartForge is not "a Minitab replacement" — it fills the lightweight, zero-friction, presentation-ready slice. We draw the boundary honestly: for DOE, reliability or complex modeling, Minitab remains the right tool; for fast, correct, good-looking, exportable routine SPC charting, this is quicker. The table below spells out the differences.'),
    ],
    features: [B('免安装、免注册、免费起步；所有计算在浏览器本地完成。', 'No install, no sign-up, free to start; all computation happens locally in the browser.'), B('图是为汇报设计的：发丝线、克制用色、矢量导出，直接进 PPT。', 'Charts are designed for presentations: hairline strokes, restrained color, vector export straight into slides.'), B('输出带白话结论与签核外壳的 SPC 报告，而不只是一张图。', 'Ships plain-language conclusions and a sign-off-ready SPC report, not just a chart.'), F_STAT],
    faq: [
      F('ChartForge 能完全替代 Minitab 吗？', 'Can ChartForge fully replace Minitab?',
        '不能，也不打算。DOE、可靠性、多元统计等重型模块不在范围内；我们聚焦日常 SPC 出图、算指标、交报告这一段最高频的工作。', 'No, and that is not the goal. DOE, reliability and multivariate modeling are out of scope; we focus on the highest-frequency slice: routine SPC charting, metrics and reports.'),
      F('从 Minitab 迁过来要重新学吗？', 'Is there a learning curve coming from Minitab?',
        '几乎为零。这里没有菜单树和脚本：选一个工具页、粘贴数据、看结果。数据格式就是常见的 CSV 三列/两列。', 'Almost none. There is no menu tree or scripting: pick a tool page, paste data, read the result. Data is ordinary two- or three-column CSV.'),
      FAQ_FREE,
    ],
    mode: 'compare', chartType: 'capability', calc: 'capability', fields: ['usl', 'lsl'],
    related: ['free-spc-software', 'control-chart-maker', 'cpk-calculator', 'gage-rr-calculator'],
  },
];

export const SEO_SLUGS = SEO_PAGES.map((p) => p.slug);
export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}
export const TIER1 = SEO_PAGES.filter((p) => p.tier === 1);
export const TIER2 = SEO_PAGES.filter((p) => p.tier === 2);
