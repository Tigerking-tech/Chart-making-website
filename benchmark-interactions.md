# ChartForge 交互对标报告：可拖动元素 & 可开关/调整的线

> 目标：对标主流图表/图示编辑器，明确 ChartForge 在「可拖动元素」与「可开关/调整的线」上的差距，并给出可直接复用的 GitHub 开源方案（避免重复造轮子）。
> 调研日期：2026-11-02 ｜ 来源：Microsoft / Google / Datawrapper / Tableau / Power BI 官方文档 + Recharts / visx / Chart.js 官方文档与仓库。

---

## 0. 一句话结论

- **可拖动**：竞品普遍允许拖动「标题、坐标轴标题、图例、数据标签、整图」，以及（Datawrapper/Tableau）**直接拖动参考线/参考带本身**。ChartForge 已用 Pointer Events 实现「标注（callout）手柄拖动」，**已基本对标 Datawrapper/Tableau 的标注拖动**，但还缺：拖动画布内元素（标题/数据标签/图例）、拖动参考线/带、以及拖动点改数据。
- **可开关/调整的线**：竞品有一整套「线」体系——数据系列、趋势线、目标/常量线、平均线、中位数+四分位带、误差线、网格线、置信区间、参考线/带。**ChartForge 目前只做了「帕累托累计线」开关**。这一块是我们最大的对标缺口，但实现路径清晰，且已有成熟的声明式模式可照搬。
- **GitHub 拿来用**：ChartForge 是**自研 SVG 引擎**（不是 Chart.js / Recharts），所以不能把图表库整包塞进来。但有两层可复用：① **`@visx/drag`**（MIT，仅 ~几 KB，React，无 D3 依赖）可直接用于我们的 React 覆盖层拖拽手柄（含触摸、边界约束）；② **声明式标注配置 API** 照搬 `recharts` 的 `ReferenceLine/ReferenceArea/ReferenceDot` 与 `chartjs-plugin-annotation` 的 line/box/point 模型（show/hide + 颜色/虚线/宽度/透明度），设计模式直接复用，落在本引擎上。

---

## 1. 竞品「可拖动元素」对标

| 可拖动对象 | PowerPoint / Excel | Google Sheets | Datawrapper | Tableau | Figma / Canva / Miro | **ChartForge 现状** | 对标建议 |
|---|---|---|---|---|---|---|---|
| **整张图（移动/缩放）** | 拖动图表区、四角缩放 | 拖动图表到任意位置；Ctrl+Shift 拖角缩放 | — | 画布内移动 | 任意移动/缩放 | ✅ 画布块可拖拽/缩放 | 已对齐 |
| **图表标题** | ✅ 四向箭头拖动到任意位置 | Quick Edit 点击标题改字体/位置 | — | — | ✅ | ⚠️ 标题固定（选项面板改文字） | 低优先：加拖动手柄 |
| **坐标轴标题** | ✅ 可拖动 | Quick Edit 点击轴标签 | — | — | ✅ | ❌ 固定 | 低优先 |
| **图例（legend）** | ✅ 可移动 | ✅ 可移动/改位置 | — | — | ✅ | ⚠️ 位置靠选项（右/下/无） | 低优先：可加拖动 |
| **数据标签（data labels）** | ✅ 可移动单个标签 | ✅ 可移动单个标签（饼图除外） | — | — | ✅ | ❌ 固定 | 中优先 |
| **标注 / 注释（callout / annotation）** | 文本框可拖 | 注释可拖 | ✅ **参考线/带可拖动**（中心手柄移动、两端手柄调范围） | ✅ **分析对象可从面板拖入视图、拖出删除** | ✅ 自由 | ✅ **已实现标注手柄 Pointer 拖动（含触摸）** | ✅ 已对齐，建议用 `@visx/drag` 加固 |
| **参考线 / 参考带（reference line / band）** | — | — | ✅ **直接拖动线/带本身**，可调方向/颜色/透明度/线宽/虚线 | ✅ 拖入视图、拖出删除、可编辑数值 | 手动画 | ❌ 暂无参考线功能 | **高优先**：采用 recharts/chartjs-annotation 模式 |
| **数据点（改数据）** | ❌ | ❌ | ❌ | ❌ | — | ❌ | 高投入：对应 `chartjs-plugin-dragdata` 思路（拖点→改数据→重渲染） |

**关键发现**
- **Datawrapper** 的「参考线/带直接拖动 + 手柄调范围 + 方向/颜色/透明度/虚线」是我们最该对标的轻量交互，且正好落在我们「React 覆盖层 + SVG 引擎」的架构上。
- **Tableau** 的「分析对象拖入/拖出」是更重的范式，但「拖出即删除、点击即编辑」值得学。
- 竞品拖动**画布内元素（标题/标签/图例）**多依赖其原生图表对象模型；我们图表是静态 SVG，做这类拖动需给元素加可交互包裹——投入中等、价值偏低，建议排在后面。

---

## 2. 竞品「可开关 / 调整的线」对标

| 线的类型 | 代表产品 & 交互方式 | 能否显示/隐藏 | 能否调样式 | **ChartForge 现状** | 对标建议 |
|---|---|---|---|---|---|
| **数据系列（series）** | 所有产品：点击图例项即隐藏/显示该系列（Chart.js/Recharts/ECharts/Highcharts 通用范式） | ✅ 图例点击切换 | ✅ 颜色/线宽/点大小 | ⚠️ 部分图有图例但不可点击切换 | **高优先**：图例点击隐藏系列 |
| **趋势线 / 回归线** | Google Sheets（勾选 Trendline）、Power BI（Analytics 面板：线性/指数/多项式、颜色、透明度、实/虚线、线宽）、Tableau（分析面板拖入，线性/对数/指数/多项式） | ✅ 开关 | ✅ 模型+样式 | ❌ 无 | **高优先**：加趋势线开关+样式 |
| **目标 / 常量线（target / constant line）** | Tableau 常量线、Power BI 参考线、Datawrapper 参考线 | ✅ | ✅ | ❌ | **高优先**：归入「参考线」体系 |
| **平均线（average line）** | Tableau（平均线+聚合）、Datawrapper 参考线 | ✅ | ✅ | ❌ | 高优先：参考线体系 |
| **中位数 + 四分位带** | Tableau（Median with Quartiles，含 95% 置信区间带） | ✅ | ✅ | ❌ | 中优先：参考带（box/distribution） |
| **误差线（error bars）** | Excel/Sheets（可添加/删除、改方向） | ✅ | ✅ | ❌ | 中优先 |
| **网格线（gridlines）** | Google Sheets（主/次网格线数量、颜色、隐藏）、Excel | ✅ 主/次分别开关 | ✅ 数量/颜色 | ⚠️ 固定灰网格 | 中优先：主/次网格线开关 |
| **零基线（zero baseline）** | Excel/Sheets | ✅ | ✅ | ⚠️ 默认有 | 低优先 |
| **置信区间带（CI band）** | Tableau（显示置信区间开关）、趋势线置信带 | ✅ | ✅ | ❌ | 中优先：随趋势线 |
| **参考线 / 参考带（reference line / range highlight）** | Datawrapper（点击图表加线、拖拽放置、方向/颜色/透明度/虚线/线宽）、Recharts `ReferenceLine/ReferenceArea`（x/y、stroke、strokeWidth、strokeDasharray、opacity、label、ifOverflow） | ✅ | ✅ **全套** | ❌ | **最高优先**：声明式参考线/带 |
| **累计线（cumulative / Pareto）** | 帕累托图通用 | ✅ | ✅ | ✅ **已实现开关** | ✅ 已对齐 |

**关键发现**
- 竞品的「线」不是零散功能，而是**一套统一的「参考线/带」体系**（Datawrapper、Recharts、Chart.js annotation 三者高度一致）：`line / box(area) / point` 三种基元 + `show/hide + stroke + strokeWidth + strokeDasharray(虚线) + opacity + label`。我们只需对齐这一套声明式模型，就能一次性覆盖目标线、平均线、参考线、参考带。
- **图例点击隐藏系列**是行业默认预期（PPT/Excel/Recharts 全都有），我们目前缺失，应优先补。
- **趋势线**是「可开关 + 可调样式」里价值最高、最常被问到的，且与质量类图表（控制图、回归）天然契合。

---

## 3. GitHub 可复用方案（拿来用，不重造）

> 前提：ChartForge 自研 SVG 引擎（图表 = 一张 `<svg>`），交互层 = React 覆盖层。**不引入整包图表库**（那是重写），而是复用「轻量拖拽库」+「声明式标注 API 设计模式」。

| 仓库 | ★Stars | 许可证 | 能干什么 | 能否直接用于 ChartForge | 映射方式 |
|---|---|---|---|---|---|
| **`@visx/drag`**（airbnb/visx 子包） | 21,093（visx 总） | **MIT** | `Drag` 组件 + `useDrag` Hook：让任意元素可拖，支持 `restrict` 边界约束、`restrictToPath` 沿路径拖、`onDragStart/Move/End` 回调，**原生支持触摸** | ✅ **直接可用** | 替换/加固我们 `AnnotationLayer` 的手柄拖动逻辑，给参考线/带手柄用；免去自己处理触摸与边界 |
| **`react-rnd`** | 4,328 | **MIT** | DOM 元素的拖动 + 缩放（带手柄） | ✅ 可用（偏重，含缩放手柄） | 若后续要做「标注框可缩放」可用；当前 callout 只需拖，用 `@visx/drag` 更轻 |
| **`chartjs-plugin-annotation`**（chartjs 官方 org） | 625 | **MIT** | 在图表上画 line/box/point/label/polygon/ellipse；脚本化；click/hover/**drag** 交互钩子；逐属性动画 | ⚠️ **模式可复用，库不可直接装**（它绑定 Chart.js canvas） | 照搬其 `annotations: [{type, ...style, drag}]` 的**声明式配置模型**到我们引擎：线/框/点三类 + 显示隐藏 + 颜色/虚线/宽度/透明度 |
| **`recharts`** | 27,681 | **MIT** | `ReferenceLine / ReferenceArea / ReferenceDot`：`x/y/segment`、`stroke/strokeWidth/strokeDasharray/opacity`、`label`、`ifOverflow`（discard/hidden/visible/extendDomain）；图例点击隐藏系列 | ⚠️ **模式可复用** | 参考其「条件渲染即开关」「`ifOverflow` 溢出策略」「ReferenceArea 用数据坐标而非像素」的设计，落到我们的 SVG 坐标换算 |
| **`chartjs-plugin-dragdata`**（社区，MIT） | — | **MIT** | 让数据点可拖（line/bubble/bar/radar），**支持触摸**，含 `magnet` 磁吸、`round` 取整 | ⚠️ **思路可复用** | 「拖点 → 改数据 → 重渲染 SVG」的实现范式；我们不装它，而是对本引擎实现同样语义（高投入，排在后面） |

**复用决策**
1. **现在就能「拿来用」**：`@visx/drag`（MIT，极小，React，无 D3）——直接替我们的标注/参考线手柄拖动，白赚触摸支持与边界约束。
2. **设计模式照搬（不装库）**：`chartjs-plugin-annotation` 与 `recharts` 的「声明式参考线/带」API——我们引擎照此新增 `annotations` 配置项（`type: line|box|point` + `show` + 样式），渲染为可拖动的 SVG 覆盖元素。
3. **图例点击隐藏系列**：采用 Recharts/Chart.js 的通用范式（点击图例项 → 切换该 series 的 `hidden` 标志 → 重渲染），无需外部库。
4. **数据点拖动（dragdata）**：概念对齐，但我们自研引擎实现，不引入 Chart.js 插件。

---

## 4. 落地优先级建议（按 ROI 排序）

| 优先级 | 功能 | 对标竞品 | 复用方案 | 工作量 | 说明 |
|---|---|---|---|---|---|
| **P0** | 参考线 / 参考带（线/框/点，可开关+拖动+样式） | Datawrapper、Recharts、Chart.js annotation | `@visx/drag` + 声明式 annotation 模型 | 中 | 一次性补齐目标线/平均线/参考线/带，最高对标价值 |
| **P0** | 图例点击隐藏数据系列 | 全部竞品通用 | Recharts/Chart.js 范式 | 小 | 行业默认预期，缺了显得「不像专业工具」 |
| **P1** | 趋势线（线性/多项式）+ 样式 + 置信区间 | Google Sheets、Power BI、Tableau | 自研 + 选项面板 | 中 | 价值最高、最常被问 |
| **P1** | 主/次网格线开关 + 数量/颜色 | Google Sheets、Excel | 引擎 + 选项面板 | 小 | 轻量高感知 |
| **P1** | 用 `@visx/drag` 加固现有标注拖动 | — | `@visx/drag`（MIT） | 小 | 直接替换手写 Pointer 逻辑，白赚触摸+约束 |
| **P2** | 误差线 | Excel、Sheets | 引擎 | 中 | 质量类图表相关 |
| **P2** | 中位数 + 四分位带 | Tableau | 归入参考带 | 中 | |
| **P3** | 画布内元素拖动（标题/数据标签/图例） | PPT、Excel、Sheets | 元素包裹 + 拖拽 | 中 | 价值偏低，靠后 |
| **P3** | 数据点拖动改数据 | （chartjs-plugin-dragdata 思路） | 自研 | 大 | 高投入，验证需求后再做 |

---

## 5. 与「你正在用的手机预览」的直接关系

你之前在手机上反馈的两点，正好对应本报告的两类对标：
- **「标注不能拖动」** → 已用 Pointer Events 修复（对标 Datawrapper/Tableau 的标注拖动）；建议下一步用 `@visx/drag` 加固触摸体验。
- **「黄线（累计线）不能选是否显示」** → 已做帕累托累计线开关（Pareto 专属）；本报告 P0 的「参考线/带可开关」是把这类能力**泛化**成所有图表都能加目标线/平均线/参考线并随意开关与拖动。

> 结论：ChartForge 不必重造轮子——轻量拖拽用 `@visx/drag`，参考线/带的声明式模型照搬 `chartjs-plugin-annotation` 与 `recharts`，图例切换系列用行业通用范式即可。
