# ChartForge · 图表工坊（Next.js 版）

> 贴数据 → 自动选图 → 自动算统计并给结论 → 导出编辑级矢量图。正确 + 好看 + 垂直 + 自助。

- 产品需求：[PRD.md](./PRD.md)
- 竞品与开源借鉴（diagram-design 45 型全量清点 + SPC/风格开源项目）：[RESEARCH.md](./RESEARCH.md)
- 旧版 vanilla 原型（保留参考）：[classic/](./classic/)

## 快速开始

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # 生产
```

## 技术栈

- **Next.js 14（App Router, TypeScript）**：落地页/图型库 SSR 预渲染 → SEO/GEO 友好；Studio 为客户端交互。
- **图表引擎零第三方依赖**（`lib/engine/`，从 vanilla 版原样移植）：纯函数产出自包含 SVG 字符串，Server/Client 通用。
- **统计引擎自研**（`lib/engine/stats/`）：线性回归+相关系数、I-MR 控制限、Western Electric 判异、Cp/Cpk、直方图分箱、正态曲线。

## 目录

```
app/
  layout.tsx            全局 metadata + SoftwareApplication JSON-LD
  page.tsx              落地页（SSR）
  studio/page.tsx       作图 Studio（客户端交互）
  gallery/page.tsx      图型库（SSR 预渲染 7 类图 SVG）
  pricing/page.tsx      定价
  api/brand/route.ts    品牌接入：抓网址→提色（饱和度加权）+ 字体，规避 CORS
  sitemap.ts robots.ts  SEO
public/llms.txt         GEO：给 ChatGPT/Perplexity 等 AI 引擎的站点说明
lib/
  charts.ts             图表注册表（渲染入口 + 示例数据 + 类型元数据）
  engine/               base(设计系统) themes(5 套主题+WCAG) stats charts data export
components/             Nav / Footer / ChartView / Studio
```

## 功能（M1 已落地）

- 7 类图：柏拉图、柱状、散布（回归+r）、直方图（正态曲线+规格限）、I-MR 控制图（判异）、折线、鱼骨图
- 5 套主题 + 自定义品牌色（WCAG AA 对比度校验）+ 输入网址抓取品牌色
- 智能推荐图型（按数据形态）
- 导出 SVG（矢量）/ PNG 2×
- SEO：SSR、sitemap、robots、OpenGraph、JSON-LD；GEO：llms.txt
- 无障碍：SVG `role="img"`

## 路线图

见 [PRD.md](./PRD.md) §9：M2 管制图族全量 + Cp/Cpk 结论面板 → M3 导入重绘（Mermaid/drawio/Excalidraw）→ M4 统计图 → M5 账号/团队/计费 → M6 对照 diagram-design 45 型补广度。
