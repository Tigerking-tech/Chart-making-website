# ChartForge 行业标杆、最佳实践与差异化特色

> 目标：把"对标—学习—差异化"三步落到可执行的产品决策上。
> 范围：面向欧美市场的 Web 图表 SaaS，核心是 **QC / SPC 质量图表 + 多风格 + 非技术人员可用**。

---

## 一、行业标杆地图（按赛道分层）

市场不是一块铁板，而是**两条轴交叉**：横轴是"好不好看 / 是否面向非技术人群"，纵轴是"统不统计正确 / 是否真懂 QC"。当前**没有任何一个玩家同时占据右上角**——这正是我们的空白。

### 赛道 A：编辑级 / 通用图表工具（"好看"，但零统计）
| 标杆 | 定位 | 关键事实（实地核实） |
|---|---|---|
| **Datawrapper** | 新闻编辑室标准 | 被 Guardian / BBC / FT / Reuters / UN 采用；step-based 编辑器；accessible by default；响应式嵌入 web/PPT/print；custom theme 做品牌一致；**免费层只给 PNG，SVG/PDF 在付费层**；不擅长探索性分析，要求预聚合的干净数据 |
| **Flourish** | 模板 / 动画 / 故事 | 50+ 模板、bar-chart race、scrollytelling；已被 Canva 收购；局限在模板内 |
| Tableau Public / RAWGraphs | 仪表盘 / 小众图 | 多图联动仪表盘；RAWGraphs 开源、跑在浏览器、出 SVG |

### 赛道 B：QC / SPC / 统计工具（"正确"，但难看、贵、桌面化）
| 标杆 | 定位 | 关键事实 |
|---|---|---|
| **Minitab** | 黄金标准（50 年） | 统计深度与可靠性；"Assistant" 引导非统计人员；Cp/Cpk、DOE、MSA(Gage R&R)；企业信任 + 培训生态；**年订阅常 >$1000/人**，界面偏旧，学习曲线陡 |
| **JMP (SAS)** | 交互式统计发现 | 动态链接（点控制图异常点→联动散点看关联变量）；JSL 脚本自动化；同样贵 |
| **QI Macros** | Excel 插件 | **$375 一次性**；Control Charts Wizard 自动选对图；300+ 模板、FMEA/Gage R&R/charter 填空式；便宜快，但**绑 Excel、不美、无导出抛光** |
| **SigmaDesk** | 现代 Web SPC（最接近的直接竞品） | I-MR / X̄-R/S、Cp/Cpk、MSA；"built by engineers, for engineers"；干净现代 UI；**但偏工程师向、不美、无报告/演示输出** |
| **InfinityQS / WinSPC** | 实时车间 SPC | 实时采集 + 报警闭环（detect→alert→correct）；图形化报告生成器 + 模板；**企业级、非报告/演示场景** |

### 赛道 C：可借鉴的开源（拿来即用的"砖块"）
- **NovaSPC / QCSPCChart**：控制图常数表（A2/A3/D3/D4/B3/B4/d2…）与判异逻辑——我们已移植口径。
- **D3 / Observable Plot / Vega-Lite**：声明式 SVG 渲染范式、比例尺与坐标轴——我们自写引擎时借鉴其"无 DOM 依赖、SSR 可渲染"的思路。

---

## 二、标杆的最佳实践（每条都具体、可学）

**Datawrapper（我们外观与易用性的标杆）**
- 零设计技能：step-based 编辑器（数据 → 选图 → 调细节 → 发布）。
- 默认可达：颜色、不重叠标签、不碰撞图例，开箱即正确。
- 响应式预览：多尺寸实时反映改动。
- 品牌一致：custom theme（字体 / 色板 / 版式），团队共享默认设置，杜绝"每张图各调一次"。
- 嵌入无处不在：web / PPT / 打印 / 移动，同一张图到处可用。
- 纪律：**每张图必有 description + source 字段**；**标题即结论**（finding in the title）。
- 输出分级：SVG/PDF 在付费层，逼出订阅。

**Flourish**
- 模板驱动降低门槛；模板内风格天然一致；动画/交互承载"讲故事"而非炫技。

**Minitab（我们统计严谨性的标杆）**
- "Assistant" 把非统计人员领到正确的检验方法并解释结果——**统计不应是黑箱**。
- 过程能力（Cp/Cpk）+ DOE + MSA 构成质量闭环；企业信任靠合规叙事与培训生态。

**JMP**
- 动态链接：异常点一键联动关联变量——**诊断不是孤立看图，而是关联洞察**。

**QI Macros**
- 便宜 + 快：选数据 → 点按钮 → 出图；嵌入用户已有的 Excel 工作流；填空式模板（FMEA、Gage R&R、charter）直接给交付物。

**SigmaDesk**
- 现代 Web SPC 工作区；工程可信话术（"correct by the math"）比"功能清单"更有说服力。

**WinSPC / InfinityQS**
- 报警闭环（detect→alert→correct）；图形化报告生成器 + 模板——**质量结果要能拼成报告流转**。

---

## 三、空白市场 & 我们的特色

### 空白：没人同时占有"好看 + 统计正确 + 可直接进报告/董事会/论文"
- Datawrapper：好看，**零统计**（无控制限、无 Cp/Cpk、无判异）。
- Minitab / JMP：正确，**贵 / 难 / 丑 / 桌面**。
- QI Macros：便宜快，**绑 Excel、不美、无导出抛光**。
- SigmaDesk：现代 SPC，**工程师向、不美、无报告/演示输出**。
- WinSPC：实时车间，**非报告/演示场景**。

### 我们的定位：**出版级 SPC（Publication-grade SPC）**
> 统计正确（控制图 / Cp/Cpk / Western Electric 判异） + 编辑级美观（Datawrapper 级） + 浏览器里直接产出可进报告、董事会、论文的成品。

### 签名特色（Signatures）—— 把空白变成壁垒
1. **SPC 白话诊断（SPC Verdict）** ★ 已落地为 `/report`
   粘贴数据 → 自动判定受控状态、指出**第几点触发哪条 Western Electric 规则**、给出 Cpk 评级与改善建议。桥接 Minitab 的硬核统计 → 非统计人员能懂。这是对 Datawrapper（无统计）与 SigmaDesk（只给图、不管解读）的硬差异。
2. **合规报告生成器（Compliance Report）** ★ 已落地为 `/report` 的签核栏
   一键拼出 **ISO 9001 / IATF 16949 / PPAP** 框架的 QC 报告页（控制图 + 能力直方图 + 签核栏）。这是工业买家付费的核心场景，标杆在此最弱。
3. **品牌一致多图画布（Brand Canvas）**（路线中）
   多张图共用一个品牌套件（色板 / 字体 / 版式）拼到一页，导出 PDF/PPTX。Datawrapper 只做单图品牌，不做多图画布。
4. **智能选图 + 自动给统计结论**（已有基础）
   对标 QI Macros 的 Wizard + Datawrapper 的 step 编辑器，但叠加"自动给统计结论"——不只是出图，而是出**答案**。

### 一句话差异化主张
> 别人给你一张好看的图，或一套你看不懂的统计软件；
> ChartForge 给你**一张好看、且统计上正确、还能直接签字归档的 QC 报告**。
