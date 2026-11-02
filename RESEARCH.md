# 开源调研与功能借鉴清单（ChartForge）

> 用途：明确「要抄什么、从哪抄、抄到什么程度」。结论均来自 2026-11-01 的公开仓库/站点核实。
> 配套：[PRD.md](./PRD.md)

---

## 1. 头号基准：diagram-design（cathrynlavery/diagram-design）

**性质**：Agent Skill（给 Claude Code / Cursor / Copilot 等编码智能体用的「技能包」），MIT，~63k★，409 commits，版本 2.6.136。
**本质**：用自然语言让 AI 产出「编辑级（editorial）」图表，输出自包含 HTML + 内联 SVG。它不是网页应用，必须有 AI 编码智能体才能用——**这正是我们的切入点**。

### 1.1 图表类型（声称 45 型，编号 01–45）
| # | 类型 | # | 类型 |
|---|---|---|---|
|01|Architecture|24|Process|
|02|IT current-state|25|Medallion|
|03|Flowchart|26|Data flow|
|04|Sequence|27|DP integration|
|05|State machine|28|DP security matrix|
|06|ER / data model|29|Sankey|
|07|Timeline|30|Fishbone|
|08|Swimlane|31|Wardley map|
|09|Quadrant|32|Kanban|
|10|Radar / spider|33|User journey|
|11|Loop / flywheel|34|Deployment|
|12|Nested|35|Dependency graph|
|13|Tree|36|UML class|
|14|Org chart|37|Story map|
|15|Layer stack|38|Database schema|
|16|Venn|39|Polar chart|
|17|Pyramid / funnel|40|Waterfall|
|18|Bar chart|41|Architecture delta|
|19|Treemap|42|Exploded axonometric|
|20|Line chart|43|Axonometric plan|
|21|Gantt|44|Heatmap|
|22|Scatter plot|45|Service blueprint|
|23|High-Level| | |

**命名变体**：Line 含 slopegraph / ridgeline / streamgraph / bump；Scatter 含 bubble / beeswarm / **box plot（箱线图）**；Treemap 含 marimekko。

### 1.2 功能集合（我们要「全部抄」的部分）
| 功能 | 我们当前状态 | 借鉴/落地方式 |
|---|---|---|
| **设计系统**：发丝线、无阴影、4px 栅格、最大圆角 10px、三字体（Instrument Serif / Geist Sans / Geist Mono）、默认 jet-black+tangerine 调色板 | ✅ 已在 `base.js` 落地（hairline / GRID=4 / maxRadius 10） | 直接继承，字体可换 Inter 栈 |
| **单一 accent 强调策略**（每图 1–2 个焦点元素，target density 4/10） | ✅ 已用 accent/accent2 两色克制用色 | 维持 |
| **品牌接入 onboarding**：抓官网→映射语义角色(paper/ink/muted/accent/link)→对比度校验→多 profile→保真收据 | 🟡 部分：已有 `makeBrandTheme` + `contrast` + `api/brand` 抓取雏形 | 对齐其「first-run gate + fidelity receipt」流程 |
| **导出**：HTML / SVG / PNG(2× via Playwright) / html+png / registry JSON | ✅ SVG/PNG 已落地；HTML 包、registry JSON 为 P2 | 加 HTML 自包含导出 |
| **无障碍**：`role="img"` + `aria-labelledby` + `<title>/<desc>` + `prefers-reduced-motion` | 🟡 部分：SVG 已是 role=img；需补 title/desc 与 reduced-motion | 每个渲染器补 title/desc |
| **导入重绘**：draw.io / Mermaid / Excalidraw → 重绘成统一设计系统 + fidelity ledger | ✗ 未做 | P1：先做 Mermaid 轻量解析，drawio/Excalidraw 路线图 |
| **四拨盘**：Format / Size(doc-inline/doc-wide/slide-16x9/slide-4x3/social-og/social-square/print) / Detail(faithful≤24/balanced≤12/simplified≤7) / Audience(engineer/mixed/executive) | 🟡 部分：已做主题「风格」与尺寸雏形 | 把 Size/Audience 做成显式选项 |
| **self_check.py** 合规自检 | 🟡 我们有 `test/render_test.mjs` 单元自检 | 升级为「CI 查重叠/裁剪/对比度契约」 |

### 1.3 它刻意不做的（≠ 我们要补的）
- **不是统计引擎**：不算控制限、Cp/Cpk、假设检验。→ 我们补（Tier 0 深度）。
- **要 AI 编码智能体**：非技术用户用不了。→ 我们做成网页自助（核心差异）。
- **风格是「一套编辑系统 + 你的品牌」，不是百花齐放多风格**：我们要的「不同风格」靠主题分支（含手绘风，见 §2.4）实现。

---

## 2. 相关开源项目（可借鉴项）

### 2.1 SPC / 质量控制（直接补我们的「正确性」壁垒）
| 项目 | 亮点 | 可抄的点 |
|---|---|---|
| **NHS London Data Viz Library**（npm，React+Recharts，MIT） | `NHSSPCChart` 遵循 NHS「Making Data Count」：**XmR / P / C / U / Run chart**，自动算 UCL/LCL/均值，**Western Electric 规则**（超限/偏移7+/趋势7+/2-of-3），🟢改善🔴恶化⚪普通原因图标，可选目标线、过程变更重算控制限 | **判异 UX 与「改善/恶化」符号语言**；其「过程变更点重算控制限」是质量人刚需 |
| **NovaSPC**（github.com/alfredang/novaspc，开源） | 浏览器 SPC：**c/u/np/p/X-mR/X̄-R/X̄-s** + 过程能力(Cp,Cpk,Pp,Ppk) + 分布拟合；面向培训 | **管制图族完整覆盖**与教学定位；可借鉴其「培训/白标进 LMS」的 Go-To-Market |
| **ControlStrip**（microcharts.dev，React，SVG 零 JS） | Shewhart 个体图：±3σ 带宽用移动极差估计（σ̂=MR̄/1.128），**只标异常点**（其余裸点），WE 子集(WE-1/WE-2/WE-4)，n<10 暂定限虚线，常数序列带宽塌缩 | **「只标异常、眼落例外」的极简控制图审美**；σ̂ 估计器口径（不用样本标准差） |
| **QCSPCChart**（JS/TS，HTML5 Canvas，独立无依赖） | 变量图(X-Bar R/X-Bar Sigma/Ind Range/Median/EWMA/MA/CuSum)、属性图(p/np/c/u/DPMO)、直方图、正态概率、柏拉图；自动控制限+报警+能力指标 | **EWMA / CuSum / 属性图算法**补全我们的 Tier 0 管制图族 |

### 2.2 美观 / 风格（补「不同风格」）
| 项目 | 亮点 | 可抄的点 |
|---|---|---|
| **chart.xkcd**（timqian，MIT，~7.9k★） | 手绘 xkcd 风：抖动轴、手写字标签、卡通 tooltip；支持 line/bar/pie/radar/stacked | **「手绘风」主题分支**——用户要「不同风格」的直接来源 |
| **rough.js / roughViz**（MIT） | 草图/手绘风 SVG/Canvas 原语 | 与 chart.xkcd 同理，可作为渲染风格层 |
| **diagram-design**（见 §1） | 编辑级矢量风 | 主设计语言 |

### 2.3 声明式图规范（补「智能选图」后端表达层）
| 项目 | 亮点 | 可抄的点 |
|---|---|---|
| **Vega-Lite**（BSD，~5.5k★） | 高级图形语法，JSON 规范秒出图，可保存分享 | **「贴数据→声明式规范→渲染」** 的中间表达层 |
| **Flint**（Microsoft，MIT，~4.5k★） | 图规范语言，编译到 Vega-Lite/ECharts/Chart.js/Plotly | 多后端编译思路 |
| **Observable Plot**（ISC，~5.4k★） | 极简 API，探索性可视化 | 链式数据→图 的简洁写法参考 |

### 2.4 通用图表库（Tier 2 广度时优先复用，而非自研）
> 原则：Tier 2（通用商业/信息图）**浅而快、调库即渲染**，不要自研重造。下列按需引入或借鉴 API：
- **Apache ECharts**（67.6k★，Apache-2.0）：类型最全，适合 treemap/sankey/heatmap/radar 等。
- **Chart.js**（67.8k★，MIT）/ **ApexCharts**（SVG）：常规柱/线/饼。
- **Frappe Gantt**：甘特；**billboard.js**：D3 系复用。
- 注意：引入第三方库会牺牲「完全自包含矢量 + 统一设计系统」的纯净度，建议 Tier 2 仅在缺类型时按需引入，并保持 token 映射覆盖。

---

## 3. 借鉴优先级（落地顺序）

1. **P0（立刻对齐 diagram-design）**：设计系统铁律、语义 token、品牌接入 + WCAG、导出 SVG/PNG、无障碍 title/desc。
2. **P0（补正确性）**：从 NHS / NovaSPC / ControlStrip / QCSPCChart 借 Western Electric 规则、X̄-R/X̄-s/p/np/c/u 算法、σ̂ 移动极差估计、Cp/Cpk。
3. **P1（风格分支）**：chart.xkcd/rough 的「手绘风」作为可选主题。
4. **P1（导入重绘）**：Mermaid 轻量解析优先；drawio/Excalidraw 路线图。
5. **P2（表达层）**：Vega-Lite/Flint 思路做「智能选图」后端；Tier 2 广度用 ECharts 等按需补。

---

## 4. 一句话结论
> diagram-design 证明了「丑图→编辑级矢量图」的强需求且免费化；我们**抄它的功能集合但工程化为网页自助**，并用 **NHS/NovaSPC/ControlStrip/QCSPCChart 的 SPC 算法补上它不会的「正确性」**，再用 **chart.xkcd 类的风格分支满足「不同风格」**——形成「正确 + 好看 + 垂直 + 自助」的组合壁垒。
