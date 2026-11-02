# ChartForge · 图表工坊

一个面向**非技术质量/运营人群**的 Web SaaS：贴数据 → 选图 → 换风格 → 导出矢量图。
设计哲学继承自开源项目 **diagram-design**（编辑级矢量出图、发丝线、无阴影、4px 栅格、语义色 token），
但去掉了"必须依赖 AI 编码智能体"的门槛，并补上了通用美化工具缺失的**统计正确性**。

## 为什么做这个（与竞品的差异）

| 阵营 | 代表 | 强 | 弱 |
|---|---|---|---|
| 专业统计 | Minitab / JMP / SigmaXL | 算得对（控制限、Cp/Cpk、MSA） | 丑、贵（$200/月级） |
| 网页美化 | Canva / Datawrapper / Flourish / make-charts | 好看、能品牌化 | 不会算统计 |
| 本产品 | **ChartForge** | **会算 + 好看 + 非技术可用 + 品牌一致** | 早期阶段 |

> 市场空档：>$25–40/月 到 $200/月 之间，缺一个"**正确且拿得出手**"的轻量质量图表工具。

## 功能

- **7 类图表**：柏拉图、柱状图、散布图（含回归+相关系数）、直方图（含正态曲线+规格限）、控制图（I-MR + Western Electric 判异）、折线图、鱼骨图。
- **多主题 / 品牌一致**：浅色 / 深色 / 学术 / 商务 / 自定义品牌（取色 + 从网址提取 + WCAG 对比度自检）。所有图共用一套语义 token，切换主题=只换映射。
- **智能选图**：按数据形态（类别+数值 / 两数值 / 单数值序列）自动推荐图表类型。
- **导出**：SVG（矢量，PPT 无损）/ PNG（2× 高清）。
- **统计引擎自研**：均值/标准差、线性回归、I-MR 控制限、Western Electric 四规则判异、Cp/Cpk、直方图分箱。

## 运行

```bash
# 方式一：零依赖 Python 服务（推荐，含 /api/brand 代理）
python3 server.py
# 打开 http://localhost:8000

# 方式二：任意静态服务器
python3 -m http.server 8000
```

> 必须用 HTTP 服务访问（ES Module 不支持 file:// 直接打开）。

## 目录结构

```
index.html              入口页面（左控制面板 + 右预览）
styles/app.css          UI 样式
src/
  base.js               设计系统原语（SVG 原语、4px 栅格、niceScale、比例尺）
  themes/themes.js      主题定义 + WCAG 对比度
  themes/brand.js       品牌主题生成 + 网址取色客户端
  stats/stats.js        统计引擎（回归/控制图/能力指数/分箱）
  charts/               7 个渲染器，各返回自包含 SVG 字符串
  data/parser.js        CSV 解析 + 类型推断
  data/recommend.js     智能选图 + 数据映射
  export/exporter.js    SVG/PNG 导出
  main.js               UI 串联
server.py               零依赖静态服务 + 品牌色提取代理
test/render_test.mjs    纯模块渲染自检（node test/render_test.mjs）
```

## 路线图（按 Tier 分层投入）

- **Tier 0（已做·立命之本）**：质量/过程类图 + 统计正确性。
- **Tier 1（下一步）**：箱线图、正态概率图、残差图、假设检验、置信区间、相关矩阵；过程能力图 Cp/Cpk 可视化。
- **Tier 2（补齐门面）**：饼/环形/雷达/漏斗/桑基/甘特/日历热力图等通用商业图（调库即可）。
- **商业化**：Free / Pro（$15–25，去署名+矢量导出）/ Team（$30–50，共享品牌主题+SSO）/ Enterprise（私有化+SLA）。
```
