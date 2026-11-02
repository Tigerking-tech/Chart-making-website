# ChartForge · 图表工坊 — 产品需求文档（PRD）

| 字段 | 内容 |
|---|---|
| 文档版本 | v1.0 |
| 日期 | 2026-11-01 |
| 状态 | 待评审（Draft） |
| 作者 | Product / Eng（AI 协作） |
| 关联文档 | [RESEARCH.md](./RESEARCH.md)（竞品与开源借鉴）、[README.md](./README.md)（工程说明） |

---

## 1. 产品概述

### 1.1 一句话定位
> **面向质量 / 运营 / 数据人群（以及学生与研究者）的 Web 图表工坊：贴数据 → 自动选对图 → 自动算统计并给出结论 → 导出可直接进 PPT / 报告 / 论文的「编辑级矢量图」，且全团队视觉品牌一致。**

### 1.2 背景与要解决的问题
当前用户做一张「能拿得出手」的专业图表（尤其质量工具：柏拉图、管制图、鱼骨图、直方图、散布图等）有三大痛点：

1. **算得对很难**：管制图要手算 UCL/LCL、Cp/Cpk、Western Electric 判异，Excel 没有原生支持，Minitab 又贵又丑。
2. **画得好很难**：Minitab / QI Macros / SigmaDesk 等工具图「工科丑」、配色单一，塞进 PPT 像拼凑。
3. **风格不统一**：张三用 Minitab、李四用 Excel，同一份汇报里图风格各异，读起来像地摊货。

市场上「会算的不会美、会美的不会算」——这正是 ChartForge 要占的缝隙（详见 RESEARCH.md）。

### 1.3 设计哲学（直接继承并工程化 diagram-design）
- **无阴影、发丝线（1px hairline）、4px 栅格、最大圆角 10px**：拒绝「Mermaid slop」式的默认丑图。
- **语义色 token（paper / ink / muted / accent / accent2 / grid / font）**：主题切换与品牌一致靠改 token 映射，而非硬编码颜色。
- **自包含矢量输出**：SVG 无限缩放不糊，直接落进任意底色幻灯片。

---

## 2. 目标用户与场景

| 用户群 | 核心场景 | 付费意愿 |
|---|---|---|
| **质量工程师 / 六西格玛黑带** | 产线 SPC、过程能力分析、改善报告 | 高（工具即生产力） |
| **工业工程 / 统计 师生 & 研究者** | 作业、毕设、期刊投稿图（要规范矢量） | 中（研究生有经费，本科生低） |
| **咨询 / 培训师** | 给客户交付统一品牌的报告 | 高（按团队/席位收） |
| **运营 / 增长 / 数据分析** | 业务图表、看板、汇报 | 中 |
| **企业市场 / 品牌部门** | 对外物料视觉一致 | 中（团队版） |

**不做**：纯娱乐、纯美术设计、通用 BI 大盘（那是用 Tableau / Power BI 的场景）。

---

## 3. 核心价值主张与差异化

| 维度 | 纯美化工具（diagram-design / make-charts / Canva） | 纯统计工具（Minitab / QI Macros） | **ChartForge** |
|---|---|---|---|
| 统计正确性（控制限/Cp/Cpk/判异） | ✗ | ✓ | **✓** |
| 编辑级美观 / 品牌一致 | ✓ | ✗ | **✓** |
| 非技术用户网页端可用 | 部分 | ✗ | **✓** |
| 垂直质量场景术语/判读 | ✗ | ✓ | **✓** |
| 免费 / 低价门槛 | ✓ | ✗ | **Freemium** |

**差异化一句话**：「**正确 + 好看 + 垂直 + 自助**」的组合，并且把 diagram-design 的「编辑级矢量出图」从「需 AI 编码智能体」降级为「普通人打开网页就能用」。

---

## 4. 功能需求总览

按优先级 **P0（必须有）/ P1（应有）/ P2（增强）** 划分。图型完整目录见 §4.1，diagram-design 功能平铺见 RESEARCH.md §2。

### 4.1 图表引擎（图型目录与 Tier 分层）

> 当前已落地（P0 核心，已写引擎）：**柏拉图、柱状、散布（含回归+r）、直方图（正态曲线+规格限）、I-MR 控制图（含 Western Electric 判异）、折线、鱼骨图**。
> 下列为完整目标目录，引用 diagram-design 的 45 型作为「广度上限」参考。

**Tier 0 — 立命之本（深度，必须会算统计）【P0】**
- 柏拉图 Pareto、管制图（I-MR / X̄-R / X̄-s / p / np / c / u）、直方图（带规格限+正态曲线）、鱼骨图、散布图（回归+相关系数）、层别法、Run Chart、过程能力 Cp/Cpk 图。

**Tier 1 — 相邻统计（中深度，共用统计引擎）【P1】**
- 箱线图、正态概率图、残差图、假设检验图、置信区间、相关矩阵、时间序列。

**Tier 2 — 通用商业 / 信息图（浅，调库即渲染）【P1/P2】**
- 引用 diagram-design 45 型中与商业/信息图重叠的部分：Bar、Treemap、Line、Gantt、Scatter、Sankey、Funnel/Pyramid、Radar、Quadrant、Heatmap、Waterfall、Tree/Nested/Org、Timeline、Swimlane、Venn、State machine、Sequence、Flowchart、ER、Architecture、Kanban、User journey、Wardley、Service blueprint、Polar 等。

> **原则：引擎宽、入口窄。** 第一版只暴露 Tier 0 的核心入口；Tier 2 的广度通过「贴数据→智能选图」体现，不堆按钮（详见 RESEARCH.md 与 §4.6）。

### 4.2 设计系统【P0】
- 继承 diagram-design 规则：发丝线、无阴影、4px 栅格、最大圆角 10px、三字体栈。
- 内置主题：浅 / 深 / 学术 / 商务 / 自定义品牌（见 §4.3）。
- 所有图只用语义 token，禁止硬编码颜色。

### 4.3 品牌接入（Brand Onboarding）【P0/P1】
- **抓网址提取配色**：输入公司 URL → 服务端抓取主页 → 提取主色/辅色/字体 → 自动映射为语义 token（对齐 diagram-design 的 brand onboarding）。
- **WCAG AA 对比度自动校验**：accent 落在 paper 上需 ≥ 4.5（正文）/ ≥ 3（大字），不达标给建议。
- **多 Profile**：一个账号存多套品牌（服务多客户咨询）。
- 实现位置：`app/api/brand`（服务端抓取，规避浏览器 CORS）+ 客户端 `makeBrandTheme` + `contrast`。

### 4.4 导入重绘（Import / Redraw）【P1/P2】
- 目标支持：draw.io / diagrams.net（.drawio/.xml）、Mermaid（.mmd/围栏块）、Excalidraw（.excalidraw.json）。
- 作用：把用户已有的丑图「重绘」成同一套设计系统（diagram-design 已验证需求）。
- 首版可先做 Mermaid→SVG 的轻量解析；drawio/Excalidraw 作为路线图。

### 4.5 导出（Export）【P0】
- **SVG**（矢量，PPT/Illustrator 可继续改）、**PNG 2×**（高清，兼容）。
- 透明背景导出（落进任意底色幻灯片不突兀）。
- 可选：HTML 自包含包、PDF（P1）。

### 4.6 智能选图（Smart Chart Selection）【P0/P1】
- 依据数据形态自动推荐图型：
  - 类别 + 数值 → 柏拉图 / 柱状
  - 时间 + 数值 → 折线 / 管制图 / Run Chart
  - 两个数值 → 散布 + 回归
  - 单数值列 → 直方图 / 控制图
  - 层级结构（JSON）→ 鱼骨 / 树 / treemap
- **同一份数据一键换图**（柏拉图 ↔ 柱状 ↔ 饼 ↔ treemap）。

### 4.7 无障碍（Accessibility）【P0】
- 每个 SVG：`role="img"` + 解析的 `aria-labelledby` + 首子 `<title>/<desc>`（diagram-design 标配）。
- `prefers-reduced-motion` 时显示静态帧。
- 对比度契约在主题层强制执行。

### 4.8 四个拨盘（The Four Dials，对齐 diagram-design）【P1】
- **Format**：html / svg / png / html+png
- **Size**：doc-inline / doc-wide / slide-16x9 / slide-4x3 / social-og / social-square / 打印
- **Detail**：faithful(≤24 节点) / balanced(≤12) / simplified(≤7) 降级阶梯
- **Audience**：engineer / mixed / executive（仅改措辞）

### 4.9 团队 / 协作 / 计费【P2，商业化外壳】
- 账号体系、项目私有、共享品牌主题、锁定调色板（团队成员不能选品牌外颜色）、SSO、审计留痕。
- 计费阶梯（沿用 Datawrapper/Flourish 已验证的漏斗）：Free（带署名）/ Pro（去署名+矢量导出）/ Team（协作+品牌主题+SSO）/ Enterprise（私有化+SLA）。

---

## 5. 竞品与开源借鉴（摘要）

完整清单见 [RESEARCH.md](./RESEARCH.md)。要点：

- **diagram-design（开源，63k★）**：45 型 + 设计系统 + 品牌接入 + 导入重绘 + 四拨盘。**我们要抄其功能集合**，但它要 AI 编码智能体才能用——我们把它工程化为网页自助。
- **NHS London Data Viz / NovaSPC / ControlStrip / QCSPCChart**：SPC 控制图的开源实现，Western Electric 规则、XmR/p/c/u、Cp/Cpk 是**直接可借鉴的算法与 UX**。
- **chart.xkcd / rough.js**：手绘风格——可作为「风格」分支（不同风格）。
- **Vega-Lite / Flint / Observable Plot**：声明式图规范，可作为「智能选图」后端的表达层参考。

---

## 6. 技术架构（Next.js）

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | **Next.js 14+（App Router, TypeScript）** | 服务端渲染落地页 → SEO/GEO 友好；Studio 用客户端组件交互 |
| 图表引擎 | 纯 TS/ESM 模块（`lib/engine/*`） | 无第三方图表库依赖，返回自包含 SVG 字符串，框架无关 |
| 统计引擎 | `lib/engine/stats` | 回归、I-MR、Western Electric、Cp/Cpk、正态、分箱 |
| 样式 | CSS Module / Tailwind（轻量） | 仅 UI 外壳，图表本身用 SVG |
| 品牌接入 | `app/api/brand`（Node fetch + 简易取色） | 服务端绕开 CORS |
| 导出 | 客户端 `Blob` 下载 SVG/PNG（canvas 栅格化） | 无需后端 |
| 部署 | Vercel / 任意 Node 主机 | 静态 + 函数 |

**首版目录**
```
app/
  layout.tsx          根布局 + 全局 metadata + JSON-LD
  page.tsx            落地页（SSR，SEO）
  studio/page.tsx     交互作图（client）
  gallery/page.tsx    图型画廊（SSR，预渲染各图 SVG）
  pricing/page.tsx    定价
  api/brand/route.ts  抓网址提取品牌色 + WCAG
  sitemap.ts robots.ts
  llms.txt (route)    GEO：给 AI 引擎的结构化站点说明
lib/engine/           (移植自 src/) base + themes + stats + charts + data + export
components/           ChartView / Studio / Nav / Footer
```

---

## 7. SEO / GEO 策略

- **SEO**：落地页 SSR + 语义化 `<h1>/<h2>`、每个图表类型独立可索引页面/锚点、`sitemap.xml`、`robots.txt`、OpenGraph、结构化数据（SoftwareApplication / Product JSON-LD）。
- **GEO（Generative Engine Optimization）**：提供 `llms.txt` + 每页清晰的事实性描述，让 ChatGPT / Perplexity / Claude 等「答案引擎」在回答「how to make a control chart / pareto chart maker」时引用本站。重点覆盖长尾质量词（control chart maker、pareto chart generator、SPC chart online）。
- **内容飞轮**：博客/模板页（「用 Excel 做管制图的 5 个坑」「柏拉图怎么读」）承接搜索流量，再导向 Studio。

---

## 8. 定价与商业化（建议阶梯）

| 层级 | 价格 | 解锁 |
|---|---|---|
| Free | $0 | 作图、PNG 导出、**带署名** |
| Pro | $15–25/月 | 去署名 + **SVG/PDF 矢量导出** + 项目私有 |
| Team | $30–50/用户/月 | 协作 + **共享品牌主题/锁配色** + SSO |
| Enterprise | 定制 | 私有化 / SLA / 审计 |

付费触发器（业界已验证）：去署名 → 矢量导出 → 私有&协作 → 品牌主题/SSO。

---

## 9. 里程碑（路线图）

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | 引擎 + 7 类图 + 设计系统 + 导出 + 品牌接入（原型） | ✅ 已完成（vanilla 版） |
| M1 | **Next.js 重写**（落地页/Studio/Gallery/Pricing + SEO/GEO + api/brand） | 🔨 本迭代 |
| M2 | 补全 Tier 0 管制图族（X̄-R/X̄-s/p/np/c/u）+ Cp/Cpk 结论面板 | 待启动 |
| M3 | 导入重绘（Mermaid → 轻量；drawio/Excalidraw） | 待启动 |
| M4 | Tier 1 统计图（箱线/正态概率/置信区间） | 待启动 |
| M5 | 账号/团队/计费（Free/Pro/Team 漏斗） | 待启动 |
| M6 | Tier 2 广度扩展（对照 diagram-design 45 型补缺） | 长期 |

---

## 10. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 免费竞品（make-charts / SigmaDesk / Flourish）抢搜索词 | 不靠 SEO 单点起量；用「正确+垂直+品牌」差异化与产品价值抢人 |
| AI 编码智能体（diagram-design 本身）把「美化」免费化 | 我们补的是「非技术用户网页端 + 统计正确性」，避开纯美化红海 |
| 图型广度 = 敌人增多（撞 Canvas/Tableau） | 广度服务于窄定位，不做通用 BI |
| 统计算错即失去信任 | 控制限/Cp/Cpk 与 NHS/SPC 开源实现交叉校验；单元测试覆盖 |
| 品牌接入抓取成功率 | 服务端多策略解析 + 手动覆盖兜底 |

---

## 11. 验收标准

- [ ] 落地页 Lighthouse SEO ≥ 95，含 JSON-LD 且通过校验。
- [ ] Studio 贴 CSV → 7 类图实时渲染；切主题/品牌色立即联动。
- [ ] 控制图正确计算 UCL/LCL 并标注 Western Electric 判异点。
- [ ] 导出 SVG（矢量）、PNG 2× 正常；SVG 含 `role="img"` + title/desc。
- [ ] `api/brand` 对常见官网返回合理主色且 WCAG 校验生效。
- [ ] Gallery 页 SSR 预渲染各图，无客户端报错。
- [ ] 无头浏览器逐页截图核对，中文/英文标签均不溢出。
