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

## 站点域名配置

canonical / sitemap / robots / llms.txt / OG 的绝对地址统一由 `lib/site.ts` 生成。

- 正式部署设置 `NEXT_PUBLIC_SITE_URL=https://你的域名`（结尾不要带 `/`）。
- Vercel / Cloudflare Pages 部署会自动读取平台域名环境变量，无需手动设置。
- 未配置时回退到 IANA 保留示例域 `https://chartforge.example.com`，此时 `SITE_URL_IS_PLACEHOLDER` 为 `true`；这个构建只用于本地开发，不要当正式站点发布。

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
  gallery/page.tsx      图型库（SSR 预渲染全部图型 SVG，含搜索与分类）
  pricing/page.tsx      定价
  tools/[slug]/page.tsx 20 个交互式 SEO 工具页（SSG）
  llms.txt/route.ts     GEO：动态生成给 ChatGPT/Perplexity 等 AI 引擎的站点说明
  api/brand/route.ts    品牌接入：抓网址→提色（饱和度加权）+ 字体，规避 CORS
  sitemap.ts robots.ts  SEO
lib/
  charts.ts             图表注册表（渲染入口 + 示例数据 + 类型元数据）
  site.ts               站点域名（canonical / sitemap / robots / OG 统一入口）
  engine/               base(设计系统) themes(5 套主题+WCAG) stats charts data export
components/             Nav / Footer / Studio / SeoTool / GalleryFilter …
```

## 功能（已落地）

- 78 种图型：质量工具（SPC 管制图族、Cp/Cpk、柏拉图、鱼骨图）、基础图表、统计、架构与流程图、比较分析、分布与分解、时间、实体建模、流量、体验与过程、轴测，以及 20 种原创论文图表
- 5 套主题 + 自定义品牌色（WCAG AA 对比度校验）+ 输入网址抓取品牌色
- 智能推荐图型（按数据形态）、参考线/参考带、趋势线与误差棒等叠加层
- 导出 SVG（矢量）/ PNG 2×
- 20 个交互式免费工具页 + 图型库搜索/分类
- SEO：SSR/SSG、sitemap、robots、OpenGraph、JSON-LD；GEO：动态 llms.txt + AI 爬虫放行 + 来源归因
- 无障碍：SVG `role="img"`

## 路线图

见 [PRD.md](./PRD.md) §9：M2 管制图族全量 + Cp/Cpk 结论面板 → M3 导入重绘（Mermaid/drawio/Excalidraw）→ M4 统计图 → M5 账号/团队/计费 → M6 对照 diagram-design 45 型补广度。
