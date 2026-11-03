// lib/charts.ts — 图表注册表：封装引擎，供 React 组件（客户端/服务端）统一调用。
// 纯函数、无 DOM 依赖，可在 Server Component 中直接渲染 SVG。
import { THEMES, THEME_LIST, makeBrandTheme } from './engine/themes/themes.js';
import { parseTable } from './engine/data/parser.js';
import { recommend, buildPayload } from './engine/data/recommend.js';
import { checkContrast } from './engine/themes/brand.js';
import { renderPareto } from './engine/charts/pareto.js';
import { renderBar } from './engine/charts/bar.js';
import { renderScatter } from './engine/charts/scatter.js';
import { renderHistogram } from './engine/charts/histogram.js';
import { renderControl } from './engine/charts/controlChart.js';
import { renderLine } from './engine/charts/line.js';
import { renderFishbone } from './engine/charts/fishbone.js';
import { renderXbarR } from './engine/charts/xbarR.js';
import { renderP } from './engine/charts/pChart.js';
import { renderC } from './engine/charts/cChart.js';
import { renderCapability } from './engine/charts/capability.js';
import { renderEwma } from './engine/charts/ewma.js';
import { renderCusum } from './engine/charts/cusum.js';
import { renderRun } from './engine/charts/runChart.js';
import { renderNp } from './engine/charts/npChart.js';
import { renderU } from './engine/charts/uChart.js';
import { renderMsa } from './engine/charts/msa.js';
// —— 编辑级图型（借鉴 diagram-design 的 45 种视觉类型）——
import {
  renderArchitecture, renderArchitectureDelta, renderItState, renderHighLevel, renderDeployment,
  renderDpIntegration, renderFlowchart, renderProcess, renderDataFlow, renderDependency,
  renderState, renderSwimlane, renderNested, renderLoop, renderLayerStack,
  renderMedallion, renderTree, renderOrgChart, renderWardley,
} from './engine/charts/boxedge.js';
import { renderQuadrant, renderRadar, renderPolar, renderVenn, renderPyramid } from './engine/charts/comparison.js';
import { renderWaterfall, renderTreemap, renderHeatmap, renderDpSecurityMatrix } from './engine/charts/distribution.js';
import { renderTimeline, renderGantt } from './engine/charts/timeline.js';
import { renderEr, renderUmlClass, renderDbSchema } from './engine/charts/entity.js';
import { renderSankey } from './engine/charts/sankey.js';
import { renderKanban, renderUserJourney, renderServiceBlueprint, renderStoryMap } from './engine/charts/experience.js';
import { renderExploded, renderAxonometricPlan } from './engine/charts/iso.js';
import { renderSequence } from './engine/charts/sequence.js';
// —— 论文级原创图型（多序列：分组柱状 / 误差折线 / 箱线）——
import { renderGroupedBar, renderErrorLine, renderBoxplot, renderStackedBar, renderViolin, renderECDF, renderBubble, renderDensity2D } from './engine/charts/paperfigs.js';
import { numericColumns, categoricalColumns } from './engine/data/parser.js';

export type ChartType =
  | 'pareto' | 'bar' | 'scatter' | 'histogram' | 'control' | 'line' | 'fishbone'
  | 'xbarR' | 'p' | 'c' | 'capability'
  | 'ewma' | 'cusum' | 'run' | 'np' | 'u' | 'msa'
  // —— 编辑级图型（diagram-design 45 种）——
  | 'architecture' | 'architectureDelta' | 'itState' | 'highLevel' | 'deployment' | 'dpIntegration'
  | 'flowchart' | 'process' | 'dataFlow' | 'dependency' | 'state' | 'swimlane'
  | 'nested' | 'loop' | 'layerStack' | 'medallion' | 'tree' | 'orgChart' | 'wardley'
  | 'quadrant' | 'radar' | 'polar' | 'venn' | 'pyramid'
  | 'waterfall' | 'treemap' | 'heatmap' | 'dpSecurityMatrix'
  | 'timeline' | 'gantt' | 'er' | 'umlClass' | 'dbSchema' | 'sankey'
  | 'kanban' | 'userJourney' | 'serviceBlueprint' | 'storyMap'
  | 'exploded' | 'axonometricPlan' | 'sequence'
  // —— 论文级原创图型 ——
  | 'groupedBar' | 'errorLine' | 'boxplot' | 'stackedBar' | 'violin' | 'ecdf' | 'bubble' | 'density2d';

export const CHART_TYPES: { id: ChartType; label: string; group: string; gk: string; fishbone?: boolean }[] = [
  { id: 'pareto', label: '柏拉图 Pareto', group: '质量工具', gk: 'q' },
  { id: 'bar', label: '柱状图 Bar', group: '基础图表', gk: 'basic' },
  { id: 'scatter', label: '散布图 Scatter', group: '统计', gk: 'stat' },
  { id: 'histogram', label: '直方图 Histogram', group: '质量工具', gk: 'q' },
  { id: 'control', label: '控制图 I-MR', group: '质量工具', gk: 'q' },
  { id: 'xbarR', label: 'X̄-R 控制图', group: '质量工具', gk: 'q' },
  { id: 'p', label: 'p 控制图', group: '质量工具', gk: 'q' },
  { id: 'c', label: 'c 控制图', group: '质量工具', gk: 'q' },
  { id: 'capability', label: '过程能力 Cp/Cpk', group: '质量工具', gk: 'q' },
  { id: 'ewma', label: 'EWMA 控制图', group: '质量工具', gk: 'q' },
  { id: 'cusum', label: 'CUSUM 控制图', group: '质量工具', gk: 'q' },
  { id: 'run', label: '运行图 Run', group: '质量工具', gk: 'q' },
  { id: 'np', label: 'NP 控制图', group: '质量工具', gk: 'q' },
  { id: 'u', label: 'U 控制图', group: '质量工具', gk: 'q' },
  { id: 'msa', label: '量具分析 Gage R&R', group: '质量工具', gk: 'q' },
  { id: 'line', label: '折线图 Line', group: '基础图表', gk: 'basic' },
  { id: 'fishbone', label: '鱼骨图 Fishbone', group: '质量工具', gk: 'q' },
  // —— 编辑级图型（diagram-design）——
  { id: 'architecture', label: '架构图 Architecture', group: '图型', gk: 'diagram' },
  { id: 'architectureDelta', label: '架构变更图', group: '图型', gk: 'diagram' },
  { id: 'itState', label: 'IT 现状图', group: '图型', gk: 'diagram' },
  { id: 'highLevel', label: '高层架构图', group: '图型', gk: 'diagram' },
  { id: 'deployment', label: '部署图 Deployment', group: '图型', gk: 'diagram' },
  { id: 'dpIntegration', label: '数据平台集成图', group: '图型', gk: 'diagram' },
  { id: 'flowchart', label: '流程图 Flowchart', group: '图型', gk: 'diagram' },
  { id: 'process', label: '流程过程图 Process', group: '图型', gk: 'diagram' },
  { id: 'dataFlow', label: '数据流图 Data Flow', group: '图型', gk: 'diagram' },
  { id: 'dependency', label: '依赖关系图 Dependency', group: '图型', gk: 'diagram' },
  { id: 'state', label: '状态机图 State', group: '图型', gk: 'diagram' },
  { id: 'swimlane', label: '泳道图 Swimlane', group: '图型', gk: 'diagram' },
  { id: 'nested', label: '嵌套包含图 Nested', group: '图型', gk: 'diagram' },
  { id: 'loop', label: '循环飞轮图 Loop', group: '图型', gk: 'diagram' },
  { id: 'layerStack', label: '层级堆叠图 Layer Stack', group: '图型', gk: 'diagram' },
  { id: 'medallion', label: '奖章分层图 Medallion', group: '图型', gk: 'diagram' },
  { id: 'tree', label: '树状图 Tree', group: '图型', gk: 'diagram' },
  { id: 'orgChart', label: '组织图 Org Chart', group: '图型', gk: 'diagram' },
  { id: 'wardley', label: 'Wardley 地图', group: '图型', gk: 'diagram' },
  { id: 'quadrant', label: '象限图 Quadrant', group: '比较分析', gk: 'comparison' },
  { id: 'radar', label: '雷达图 Radar', group: '比较分析', gk: 'comparison' },
  { id: 'polar', label: '极坐标图 Polar', group: '比较分析', gk: 'comparison' },
  { id: 'venn', label: '韦恩图 Venn', group: '比较分析', gk: 'comparison' },
  { id: 'pyramid', label: '金字塔/漏斗 Pyramid', group: '比较分析', gk: 'comparison' },
  { id: 'waterfall', label: '瀑布图 Waterfall', group: '分布与分解', gk: 'distribution' },
  { id: 'treemap', label: '树图 Treemap', group: '分布与分解', gk: 'distribution' },
  { id: 'heatmap', label: '热力图 Heatmap', group: '分布与分解', gk: 'distribution' },
  { id: 'dpSecurityMatrix', label: '权限矩阵 Access Matrix', group: '分布与分解', gk: 'distribution' },
  { id: 'timeline', label: '时间轴 Timeline', group: '时间', gk: 'time' },
  { id: 'gantt', label: '甘特图 Gantt', group: '时间', gk: 'time' },
  { id: 'er', label: 'ER 数据模型', group: '实体建模', gk: 'entity' },
  { id: 'umlClass', label: 'UML 类图', group: '实体建模', gk: 'entity' },
  { id: 'dbSchema', label: '数据库模式', group: '实体建模', gk: 'entity' },
  { id: 'sankey', label: '桑基图 Sankey', group: '流量分析', gk: 'flow' },
  { id: 'kanban', label: '看板 Kanban', group: '体验与过程', gk: 'experience' },
  { id: 'userJourney', label: '用户旅程 User Journey', group: '体验与过程', gk: 'experience' },
  { id: 'serviceBlueprint', label: '服务蓝图 Service Blueprint', group: '体验与过程', gk: 'experience' },
  { id: 'storyMap', label: '故事地图 Story Map', group: '体验与过程', gk: 'experience' },
  { id: 'exploded', label: '爆炸轴测图 Exploded', group: '轴测图', gk: 'isometric' },
  { id: 'axonometricPlan', label: '轴测平面图 Axonometric Plan', group: '轴测图', gk: 'isometric' },
  { id: 'sequence', label: '时序图 Sequence', group: '图型', gk: 'diagram' },
  // —— 论文级原创图型 ——
  { id: 'groupedBar', label: '分组柱状图 Grouped Bar', group: '论文图表', gk: 'paperfig' },
  { id: 'errorLine', label: '误差折线图 Error Line', group: '论文图表', gk: 'paperfig' },
  { id: 'boxplot', label: '箱线图 Box Plot', group: '论文图表', gk: 'paperfig' },
  { id: 'stackedBar', label: '堆叠柱状图 Stacked Bar', group: '论文图表', gk: 'paperfig' },
  { id: 'violin', label: '小提琴图 Violin Plot', group: '论文图表', gk: 'paperfig' },
  { id: 'ecdf', label: '经验累积分布 ECDF', group: '论文图表', gk: 'paperfig' },
  { id: 'bubble', label: '气泡图 Bubble Chart', group: '论文图表', gk: 'paperfig' },
  { id: 'density2d', label: '二维密度图 2D Density', group: '论文图表', gk: 'paperfig' },
];

// 图型（节点+连线 / DSL 驱动）渲染器映射：在 renderChart 中早返回，避免进入 CSV 解析分支。
const DIAGRAM_RENDERERS: Record<string, (d: string, th: any, o: any) => string> = {
  architecture: renderArchitecture, architectureDelta: renderArchitectureDelta, itState: renderItState,
  highLevel: renderHighLevel, deployment: renderDeployment, dpIntegration: renderDpIntegration,
  flowchart: renderFlowchart, process: renderProcess, dataFlow: renderDataFlow, dependency: renderDependency,
  state: renderState, swimlane: renderSwimlane, nested: renderNested, loop: renderLoop,
  layerStack: renderLayerStack, medallion: renderMedallion, tree: renderTree, orgChart: renderOrgChart,
  wardley: renderWardley, quadrant: renderQuadrant, radar: renderRadar, polar: renderPolar, venn: renderVenn,
  pyramid: renderPyramid, waterfall: renderWaterfall, treemap: renderTreemap, heatmap: renderHeatmap,
  dpSecurityMatrix: renderDpSecurityMatrix, timeline: renderTimeline, gantt: renderGantt, er: renderEr,
  umlClass: renderUmlClass, dbSchema: renderDbSchema, sankey: renderSankey, kanban: renderKanban,
  userJourney: renderUserJourney, serviceBlueprint: renderServiceBlueprint, storyMap: renderStoryMap,
  exploded: renderExploded, axonometricPlan: renderAxonometricPlan, sequence: renderSequence,
};

export const SAMPLES: Record<ChartType, string> = {
  pareto: `不良项目,频数\n虚焊,42\n漏件,25\n偏移,15\n少锡,10\n其他,8`,
  bar: `区域,销量\n华东,320\n华南,280\n华北,210\n西部,150\n东北,90`,
  scatter: `湿度,虚焊率\n30,1.2\n35,1.5\n40,2.0\n45,2.4\n50,3.1\n55,3.6\n60,4.5\n65,5.0\n70,5.8`,
  histogram: `厚度\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04`,
  control: `测量值\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04`,
  xbarR: `测量值\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04\n9.95\n10.01\n10.03\n9.97\n10.00`,
  p: `样本,不良数,样本量\nS1,3,120\nS2,5,120\nS3,2,120\nS4,7,120\nS5,4,120\nS6,6,120\nS7,3,120\nS8,8,120\nS9,4,120\nS10,5,120\nS11,2,120\nS12,6,120`,
  c: `缺陷数\n4\n6\n5\n7\n3\n5\n8\n4\n6\n5\n7\n4\n5\n6\n3\n5\n7\n4\n6\n5`,
  capability: `厚度\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04\n9.95\n10.01\n10.03\n9.97\n10.00\n10.02\n9.98\n10.04\n9.99\n10.01`,
  line: `月份,销售额\n1,120\n2,135\n3,148\n4,160\n5,155\n6,172\n7,180\n8,176\n9,190\n10,205`,
  fishbone: `{
  "effect": "焊接不良率偏高",
  "bones": [
    {"category": "人", "causes": ["培训不足", "疲劳作业"]},
    {"category": "机", "causes": ["烙铁温度漂移", "夹具磨损"]},
    {"category": "料", "causes": ["焊锡含杂质", "PCB 氧化"]},
    {"category": "法", "causes": ["参数设置错误", "工艺文件缺失"]},
    {"category": "环", "causes": ["湿度偏高", "静电干扰"]},
    {"category": "测", "causes": ["量具未校准", "抽检方案不当"]}
  ]
}`,
  ewma: `测量值\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04`,
  cusum: `测量值\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04`,
  run: `测量值\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04`,
  np: `样本,不良数,样本量\nS1,3,100\nS2,5,100\nS3,2,100\nS4,7,100\nS5,4,100\nS6,6,100\nS7,3,100\nS8,8,100\nS9,4,100\nS10,5,100\nS11,2,100\nS12,6,100`,
  u: `样本,缺陷数,样本量\nS1,4,80\nS2,6,120\nS3,5,90\nS4,7,110\nS5,3,70\nS6,5,100\nS7,8,130\nS8,4,85\nS9,6,115\nS10,5,95\nS11,2,60\nS12,6,105`,
  msa: `操作员,零件,测量值\nA,P1,10.01\nA,P2,9.98\nA,P3,10.05\nA,P4,9.99\nA,P5,10.03\nB,P1,10.02\nB,P2,9.97\nB,P3,10.06\nB,P4,10.00\nB,P5,10.04\nC,P1,9.99\nC,P2,9.96\nC,P3,10.04\nC,P4,9.98\nC,P5,10.01`,
  // —— 编辑级图型样本（DSL / CSV）——
  architecture: `web: Web 前端 [focal]\napi: API 网关 (REST) [backend]\nauth: 鉴权服务 [security]\ndb: 用户库 (Postgres) [db]\nweb --> api | HTTPS\napi --> auth | 校验\napi --> db`,
  architectureDelta: `web: Web 前端 [focal]\napi: API 网关 [backend]\ndb: 旧库 (MySQL) [db]\npg: 新库 (Postgres) [db]\nweb --> api\napi --> db\napi ..> pg | 迁移中`,
  itState: `pos: POS 终端 [external]\nsrv:  legacy 服务 [backend]\nmon: 监控 [store]\npos --> srv | 交易\npos ..> mon | 埋点`,
  highLevel: `edge: Edge CDN [external]\nlb: 负载均衡 [focal]\nsvc: 微服务 [backend]\nstore: 数据层 [store]\nedge --> lb --> svc --> store`,
  deployment: `web: 前端 (CDN) [external]\nsvc: 订单服务 [backend]\ndb: 主库 (MySQL) [db]\ncache: Redis [store]\nlb: 负载均衡 [focal]\nlb --> svc\nsvc --> db\nsvc ..> cache`,
  dpIntegration: `src: 业务系统 [external]\ncore: 数据湖 [focal]\nbi: BI 报表 [backend]\nml: 特征平台 [store]\nsrc --> core\ncore --> bi\ncore --> ml`,
  flowchart: `start: 开始 [start]\ninput: 录入订单\ncheck: 库存充足? [decision]\npack: 拣货打包\nend: 完成 [end]\nstart --> input\ninput --> check\ncheck -->|是| pack\ncheck -->|否| input\npack --> end`,
  process: `订单: 接单 [focal]\n审核: 风控审核 [backend]\n生产: 生产 [store]\n发货: 物流 [external]\n订单 --> 审核 --> 生产 --> 发货`,
  dataFlow: `用户: 用户行为 [input]\n采集: 埋点采集 [backend]\n清洗: 数据清洗 [store]\n仓库: 数仓 [focal]\n用户 --> 采集 --> 清洗 --> 仓库`,
  dependency: `A: 模块A\nB: 模块B\nC: 模块C\nD: 模块D\nB --> A\nC --> A\nD --> B\nD --> C`,
  state: `待支付: 待支付 [start]\n已支付: 已支付\n发货: 已发货\n完成: 已完成 [end]\n待支付 --> 已支付 --> 发货 --> 完成`,
  swimlane: `客户: 客户 [external]\n销售: 销售 [backend]\n财务: 财务 [store]\n客户 --> 销售 | 下单\n销售 --> 财务 | 开票`,
  nested: `系统: 系统\n模块A: 模块A\n模块B: 模块B\n系统 --> 模块A\n系统 --> 模块B`,
  loop: `hub: 共享记忆 [focal]\n感知: 感知\n决策: 决策\n执行: 执行\n学习: 学习\nhub --> 感知\nhub --> 决策\nhub --> 执行\nhub --> 学习`,
  layerStack: `应用: 应用层\n服务: 服务层\n数据: 数据层\n应用 --> 服务\n服务 --> 数据`,
  medallion: `Bronze:  bronze 层\nSilver:  silver 层\nGold:  gold 层\nBronze --> Silver --> Gold`,
  tree: `CEO: CEO\nCTO: CTO\n工程: 工程部\n质量: 质量部\n开发: 开发组\nCEO --> CTO\nCTO --> 工程\nCTO --> 质量\n工程 --> 开发`,
  orgChart: `CEO: CEO\nCTO: CTO\n工程: 工程部\n质量: 质量部\n开发: 开发组\nCEO --> CTO\nCTO --> 工程\nCTO --> 质量\n工程 --> 开发`,
  wardley: `用户: 用户需求\n体验: 体验设计\n产品: 产品\n平台: 平台\n用户 --> 体验\n体验 --> 产品\n产品 --> 平台`,
  quadrant: `名称,x,y\n高价值高难度,8,9\n低价值高难度,2,8\n高价值低难度,9,2\n低价值低难度,2,2\n焦点项目,7,7`,
  radar: `维度,产品A,产品B\n速度,4,3\n价格,3,5\n质量,5,4\n服务,4,4\n创新,3,5`,
  polar: `类别,值\n一月,30\n二月,55\n三月,42\n四月,68\n五月,90\n六月,75`,
  venn: `A: 客户\nB: 渠道\nC: 产品\n交集: A,B = 12\n交集: A,C = 8\n交集: B,C = 6\n交集: A,B,C = 4`,
  pyramid: `层级,值\n顶层,100\n中层,60\n底层,30`,
  waterfall: `项目,值\n收入,200\n成本,-80\n利润,120`,
  treemap: `类别,值\n亚洲,40\n非洲,25\n欧洲,20\n美洲,15`,
  heatmap: `,Jan,Feb,Mar\n服务A,3,5,8\n服务B,2,8,1\n服务C,6,4,9`,
  dpSecurityMatrix: `,运维,开发,分析,访客\n对象存储,W,R,-,-\n查询引擎,RW,R,R,-\n笔记本,W,W,-,-\nBI工具,R,R,W,×\n调度器,R,W,-,-`,
  timeline: `日期,事件\n2024-01,立项\n2024-06,上线\n2024-12,复盘`,
  gantt: `任务,开始,结束\n需求,0,3\n开发,3,9\n测试,9,12`,
  er: `entity: 用户 | *id:int, name:varchar, age:int\nentity: 订单 | *id:int, >uid:int, total:decimal\nrel: 用户 1--* 订单 | 拥有`,
  umlClass: `class: 订单 | -id:int; +total():decimal; #status:string\nclass: 促销订单 | -discount:decimal; +calc():void\ninherit: 促销订单 <|-- 订单`,
  dbSchema: `table: users | id:PK int, name:varchar(50), age:int\ntable: orders | id:PK int, uid:FK->users.id int, total:decimal`,
  sankey: `源,目标,流量\nA,B,30\nB,C,20\nA,C,10\nB,D,10`,
  kanban: `col: 待办\ncard: 待办 | API 限流 | AVA-201\ncol: 进行中\ncard: 进行中 | Postgres 升级 | AVA-118\ncol: 完成\ncard: 完成 | 日志策略 | AVA-090`,
  userJourney: `stage: 浏览\ndo: 浏览 | 搜索商品\nfeel: 浏览 | neutral\nstage: 试用\ndo: 试用 | 导入数据集\nfeel: 试用 | high\nstage: 触顶\ndo: 触顶 | 导出被拦截\nfeel: 触顶 | low`,
  serviceBlueprint: `stage: 注册\nstage: 激活\ncell: customer | 注册 | 创建账号\ncell: frontstage | 注册 | 欢迎页\ncell: backstage | 注册 | 写CRM\ncell: customer | 激活 | 重试支付\ncell: frontstage | 激活 | 支付弹窗`,
  storyMap: `backbone: 发现,试用,购买,留存\nrow: 主线 | 落地页,注册,下单,激活\nslice: MVP | 关键词搜索, 表格, 公开链接`,
  exploded: `外壳\n主板 | 主芯片, 内存\n电池 | 锂电芯 | *\n后盖`,
  axonometricPlan: `房间,x,y,w,h\n客厅,0,0,4,3\n卧室,4,0,3,3\n厨房,0,3,3,2\n卫生间,3,3,1,2\n阳台,0,5,7,1`,
  sequence: `actor: 用户\nactor: 系统\nactor: 支付\nmsg: 用户 -> 系统 | 登录\nmsg: 系统 -> 支付 | 扣款\nmsg: 支付 -> 系统 | 结果\nmsg: 系统 -> 用户 | 跳转`,
  // —— 论文级原创图型（多序列）——
  groupedBar: `模型,准确率,召回率,F1\n基线,0.78,0.74,0.76\n方法A,0.86,0.83,0.84\n方法B,0.91,0.88,0.89\n方法C,0.94,0.92,0.93`,
  errorLine: `轮次,方法A,方法A误差,方法B,方法B误差\n10,0.55,0.04,0.50,0.05\n20,0.70,0.03,0.66,0.04\n30,0.80,0.03,0.78,0.03\n40,0.86,0.02,0.85,0.03\n50,0.90,0.02,0.89,0.02\n60,0.93,0.02,0.92,0.02`,
  boxplot: `组别,数值\n对照组,12.1\n对照组,11.8\n对照组,12.5\n对照组,11.5\n对照组,12.0\n对照组,13.0\n对照组,11.2\n实验组,15.2\n实验组,14.8\n实验组,16.1\n实验组,15.0\n实验组,15.6\n实验组,14.2\n实验组,16.5\n实验组,15.9`,
  stackedBar: `季度,产品A,产品B,产品C\nQ1,120,80,40\nQ2,135,110,55\nQ3,148,130,70\nQ4,160,150,90`,
  violin: `组别,数值\n对照组,12.1\n对照组,11.8\n对照组,12.5\n对照组,11.5\n对照组,12.0\n对照组,13.0\n对照组,11.2\n对照组,12.8\n对照组,11.9\n实验组,15.2\n实验组,14.8\n实验组,16.1\n实验组,15.0\n实验组,15.6\n实验组,14.2\n实验组,16.5\n实验组,15.9\n实验组,17.0\n实验组,14.6`,
  ecdf: `基线,方法A,方法B\n0.72,0.85,0.80\n0.75,0.87,0.83\n0.70,0.84,0.81\n0.78,0.90,0.86\n0.73,0.88,0.82\n0.76,0.91,0.85\n0.71,0.86,0.79\n0.74,0.89,0.84`,
  bubble: `地区,x,y,规模,类别\n华东,30,80,200,一类\n华北,45,60,120,一类\n华南,60,75,300,二类\n西南,20,40,90,二类\n东北,55,35,150,一类\n西北,70,55,80,三类\n华中,40,65,180,二类\n东南,50,85,260,三类`,
  density2d: `温度,湿度\n22,55\n24,60\n23,58\n26,68\n28,72\n25,62\n30,80\n27,66\n29,75\n31,82\n24,57\n26,64\n33,88\n32,85\n28,70\n25,59\n30,78\n27,63\n34,90\n29,77\n23,56\n35,92\n31,84\n26,67\n28,73`,
};

export const DEFAULT_TITLES: Record<ChartType, string> = {
  pareto: '柏拉图 Pareto', bar: '柱状图 Bar', scatter: '散布图 Scatter', histogram: '直方图 Histogram',
  control: '控制图 I-MR', xbarR: 'X̄-R 控制图', p: 'p 控制图', c: 'c 控制图',
  capability: '过程能力 Cp/Cpk', ewma: 'EWMA 控制图', cusum: 'CUSUM 控制图', run: '运行图 Run',
  np: 'NP 控制图', u: 'U 控制图', msa: '量具重复性与再现性 Gage R&R', line: '折线图 Line', fishbone: '鱼骨图 Fishbone',
  // 编辑级图型
  architecture: '架构图', architectureDelta: '架构变更图', itState: 'IT 现状图', highLevel: '高层架构图',
  deployment: '部署图', dpIntegration: '数据平台集成图', flowchart: '流程图', process: '流程过程图',
  dataFlow: '数据流图', dependency: '依赖关系图', state: '状态机图', swimlane: '泳道图', nested: '嵌套包含图',
  loop: '循环飞轮图', layerStack: '层级堆叠图', medallion: '奖章分层图', tree: '树状图', orgChart: '组织图',
  wardley: 'Wardley 地图', quadrant: '象限图', radar: '雷达图', polar: '极坐标图', venn: '韦恩图', pyramid: '金字塔/漏斗',
  waterfall: '瀑布图', treemap: '树图', heatmap: '热力图', dpSecurityMatrix: '权限矩阵', timeline: '时间轴',
  gantt: '甘特图', er: 'ER 数据模型', umlClass: 'UML 类图', dbSchema: '数据库模式', sankey: '桑基图',
  kanban: '看板', userJourney: '用户旅程', serviceBlueprint: '服务蓝图', storyMap: '故事地图',
  exploded: '爆炸轴测图', axonometricPlan: '轴测平面图', sequence: '时序图',
  groupedBar: '分组柱状图 Grouped Bar', errorLine: '误差折线图 Error Line', boxplot: '箱线图 Box Plot',
  stackedBar: '堆叠柱状图 Stacked Bar', violin: '小提琴图 Violin Plot', ecdf: '经验累积分布 ECDF',
  bubble: '气泡图 Bubble Chart', density2d: '二维密度图 2D Density',
};

// 英文默认标题
export const DEFAULT_TITLES_EN: Record<ChartType, string> = {
  pareto: 'Pareto Chart', bar: 'Bar Chart', scatter: 'Scatter Plot', histogram: 'Histogram',
  control: 'I-MR Control Chart', xbarR: 'X̄-R Control Chart', p: 'p Control Chart', c: 'c Control Chart',
  capability: 'Process Capability Cp/Cpk', ewma: 'EWMA Control Chart', cusum: 'CUSUM Control Chart', run: 'Run Chart',
  np: 'NP Control Chart', u: 'U Control Chart', msa: 'Gage R&R Study', line: 'Line Chart', fishbone: 'Fishbone Diagram',
  architecture: 'Architecture', architectureDelta: 'Architecture Delta', itState: 'IT Current-State', highLevel: 'High-Level',
  deployment: 'Deployment', dpIntegration: 'DP Integration', flowchart: 'Flowchart', process: 'Process',
  dataFlow: 'Data Flow', dependency: 'Dependency Graph', state: 'State Machine', swimlane: 'Swimlane', nested: 'Nested',
  loop: 'Loop / Flywheel', layerStack: 'Layer Stack', medallion: 'Medallion', tree: 'Tree', orgChart: 'Org Chart',
  wardley: 'Wardley Map', quadrant: 'Quadrant', radar: 'Radar', polar: 'Polar', venn: 'Venn', pyramid: 'Pyramid / Funnel',
  waterfall: 'Waterfall', treemap: 'Treemap', heatmap: 'Heatmap', dpSecurityMatrix: 'Access Matrix', timeline: 'Timeline',
  gantt: 'Gantt', er: 'ER Diagram', umlClass: 'UML Class', dbSchema: 'Database Schema', sankey: 'Sankey',
  kanban: 'Kanban', userJourney: 'User Journey', serviceBlueprint: 'Service Blueprint', storyMap: 'Story Map',
  exploded: 'Exploded Axonometric', axonometricPlan: 'Axonometric Plan', sequence: 'Sequence Diagram',
  groupedBar: 'Grouped Bar', errorLine: 'Error-bar Line', boxplot: 'Box Plot',
  stackedBar: 'Stacked Bar', violin: 'Violin Plot', ecdf: 'ECDF', bubble: 'Bubble Chart', density2d: '2D Density',
};

// 英文示例数据：数值样本中英通用，带文案的样本翻译为英文。
export const SAMPLES_EN: Record<ChartType, string> = {
  pareto: `Defect,Count\nCold solder,42\nMissing part,25\nShifted,15\nLow solder,10\nOther,8`,
  bar: `Region,Sales\nEast,320\nSouth,280\nNorth,210\nWest,150\nNortheast,90`,
  scatter: `Humidity,Solder defect %\n30,1.2\n35,1.5\n40,2.0\n45,2.4\n50,3.1\n55,3.6\n60,4.5\n65,5.0\n70,5.8`,
  histogram: SAMPLES.histogram, control: SAMPLES.control, xbarR: SAMPLES.xbarR, p: `Sample,Defectives,Size\nS1,3,120\nS2,5,120\nS3,2,120\nS4,7,120\nS5,4,120\nS6,6,120\nS7,3,120\nS8,8,120\nS9,4,120\nS10,5,120\nS11,2,120\nS12,6,120`,
  c: SAMPLES.c, capability: SAMPLES.capability, line: `Month,Revenue\n1,120\n2,135\n3,148\n4,160\n5,155\n6,172\n7,180\n8,176\n9,190\n10,205`,
  fishbone: `{
  "effect": "High solder defect rate",
  "bones": [
    {"category": "People", "causes": ["Insufficient training", "Fatigue"]},
    {"category": "Machine", "causes": ["Iron temperature drift", "Fixture wear"]},
    {"category": "Material", "causes": ["Solder impurities", "PCB oxidation"]},
    {"category": "Method", "causes": ["Wrong parameters", "Missing work instructions"]},
    {"category": "Environment", "causes": ["High humidity", "ESD interference"]},
    {"category": "Measurement", "causes": ["Gauge not calibrated", "Poor sampling plan"]}
  ]
}`,
  ewma: SAMPLES.ewma, cusum: SAMPLES.cusum, run: SAMPLES.run, np: `Sample,Defectives,Size\nS1,3,100\nS2,5,100\nS3,2,100\nS4,7,100\nS5,4,100\nS6,6,100\nS7,3,100\nS8,8,100\nS9,4,100\nS10,5,100\nS11,2,100\nS12,6,100`,
  u: `Sample,Defects,Units\nS1,4,80\nS2,6,120\nS3,5,90\nS4,7,110\nS5,3,70\nS6,5,100\nS7,8,130\nS8,4,85\nS9,6,115\nS10,5,95\nS11,2,60\nS12,6,105`,
  msa: `Operator,Part,Value\nA,P1,10.01\nA,P2,9.98\nA,P3,10.05\nA,P4,9.99\nA,P5,10.03\nB,P1,10.02\nB,P2,9.97\nB,P3,10.06\nB,P4,10.00\nB,P5,10.04\nC,P1,9.99\nC,P2,9.96\nC,P3,10.04\nC,P4,9.98\nC,P5,10.01`,
  // 编辑级图型（英文）
  architecture: `web: Web front-end [focal]\napi: API gateway (REST) [backend]\nauth: Auth service [security]\ndb: User DB (Postgres) [db]\nweb --> api | HTTPS\napi --> auth | verify\napi --> db`,
  architectureDelta: `web: Web front-end [focal]\napi: API gateway [backend]\ndb: Old DB (MySQL) [db]\npg: New DB (Postgres) [db]\nweb --> api\napi --> db\napi ..> pg | migrating`,
  itState: `pos: POS terminal [external]\nsrv: legacy service [backend]\nmon: monitoring [store]\npos --> srv | txn\npos ..> mon | metrics`,
  highLevel: `edge: Edge CDN [external]\nlb: Load balancer [focal]\nsvc: Microservices [backend]\nstore: Data layer [store]\nedge --> lb --> svc --> store`,
  deployment: `web: Front-end (CDN) [external]\nsvc: Order service [backend]\ndb: Primary (MySQL) [db]\ncache: Redis [store]\nlb: Load balancer [focal]\nlb --> svc\nsvc --> db\nsvc ..> cache`,
  dpIntegration: `src: Business system [external]\ncore: Data lake [focal]\nbi: BI reports [backend]\nml: Feature store [store]\nsrc --> core\ncore --> bi\ncore --> ml`,
  flowchart: `start: Start [start]\ninput: Enter order\ncheck: Stock ok? [decision]\npack: Pick & pack\nend: Done [end]\nstart --> input\ninput --> check\ncheck -->|yes| pack\ncheck -->|no| input\npack --> end`,
  process: `order: Take order [focal]\nreview: Risk review [backend]\nmake: Produce [store]\nship: Logistics [external]\norder --> review --> make --> ship`,
  dataFlow: `user: User behavior [input]\ncollect: Tracking [backend]\nclean: Cleaning [store]\nwarehouse: Warehouse [focal]\nuser --> collect --> clean --> warehouse`,
  dependency: `A: ModuleA\nB: ModuleB\nC: ModuleC\nD: ModuleD\nB --> A\nC --> A\nD --> B\nD --> C`,
  state: `unpaid: Unpaid [start]\npaid: Paid\nshipped: Shipped\ndone: Done [end]\nunpaid --> paid --> shipped --> done`,
  swimlane: `cust: Customer [external]\nsales: Sales [backend]\nfin: Finance [store]\ncust --> sales | order\nsales --> fin | invoice`,
  nested: `sys: System\nmodA: ModuleA\nmodB: ModuleB\nsys --> modA\nsys --> modB`,
  loop: `hub: Shared memory [focal]\nperc: Perceive\ndec: Decide\nexec: Execute\nlearn: Learn\nhub --> perc\nhub --> dec\nhub --> exec\nhub --> learn`,
  layerStack: `app: App layer\nsvc: Service layer\ndata: Data layer\napp --> svc\nsvc --> data`,
  medallion: `Bronze: bronze tier\nSilver: silver tier\nGold: gold tier\nBronze --> Silver --> Gold`,
  tree: `CEO: CEO\nCTO: CTO\nEng: Engineering\nQA: Quality\nDev: Dev team\nCEO --> CTO\nCTO --> Eng\nCTO --> QA\nEng --> Dev`,
  orgChart: `CEO: CEO\nCTO: CTO\nEng: Engineering\nQA: Quality\nDev: Dev team\nCEO --> CTO\nCTO --> Eng\nCTO --> QA\nEng --> Dev`,
  wardley: `user: User need\nexp: Experience\ndprod: Product\nplat: Platform\nuser --> exp\nexp --> dprod\ndprod --> plat`,
  quadrant: `Name,x,y\nHighValHard,8,9\nLowValHard,2,8\nHighValEasy,9,2\nLowValEasy,2,2\nFocus,7,7`,
  radar: `Axis,ProductA,ProductB\nSpeed,4,3\nPrice,3,5\nQuality,5,4\nService,4,4\nInnovation,3,5`,
  polar: `Category,Value\nJan,30\nFeb,55\nMar,42\nApr,68\nMay,90\nJun,75`,
  venn: `A: Customers\nB: Channels\nC: Products\nintersection: A,B = 12\nintersection: A,C = 8\nintersection: B,C = 6\nintersection: A,B,C = 4`,
  pyramid: `Tier,Value\nTop,100\nMiddle,60\nBottom,30`,
  waterfall: `Item,Value\nRevenue,200\nCost,-80\nProfit,120`,
  treemap: `Category,Value\nAsia,40\nAfrica,25\nEurope,20\nAmericas,15`,
  heatmap: `,Jan,Feb,Mar\nSvcA,3,5,8\nSvcB,2,8,1\nSvcC,6,4,9`,
  dpSecurityMatrix: `,Ops,Dev,Analyst,Guest\nObjStore,W,R,-,-\nQueryEng,RW,R,R,-\nLaptop,W,W,-,-\nBI,R,R,W,×\nScheduler,R,W,-,-`,
  timeline: `Date,Event\n2024-01,Kickoff\n2024-06,Launch\n2024-12,Review`,
  gantt: `Task,Start,End\nReq,0,3\nDev,3,9\nTest,9,12`,
  er: `entity: User | *id:int, name:varchar, age:int\nentity: Order | *id:int, >uid:int, total:decimal\nrel: User 1--* Order | owns`,
  umlClass: `class: Order | -id:int; +total():decimal; #status:string\nclass: PromoOrder | -discount:decimal; +calc():void\ninherit: PromoOrder <|-- Order`,
  dbSchema: `table: users | id:PK int, name:varchar(50), age:int\ntable: orders | id:PK int, uid:FK->users.id int, total:decimal`,
  sankey: `Source,Target,Flow\nA,B,30\nB,C,20\nA,C,10\nB,D,10`,
  kanban: `col: Todo\ncard: Todo | API rate limit | AVA-201\ncol: Doing\ncard: Doing | Postgres upgrade | AVA-118\ncol: Done\ncard: Done | Log policy | AVA-090`,
  userJourney: `stage: Browse\ndo: Browse | Search products\nfeel: Browse | neutral\nstage: Trial\ndo: Trial | Import dataset\nfeel: Trial | high\nstage: Ceiling\ndo: Ceiling | Export blocked\nfeel: Ceiling | low`,
  serviceBlueprint: `stage: Signup\nstage: Activate\ncell: customer | Signup | Create account\ncell: frontstage | Signup | Welcome page\ncell: backstage | Signup | Write CRM\ncell: customer | Activate | Retry pay\ncell: frontstage | Activate | Pay modal`,
  storyMap: `backbone: Discover,Trial,Buy,Retain\nrow: Main | Landing,Signup,Checkout,Activate\nslice: MVP | Keyword search, Table, Public link`,
  exploded: `Shell\nBoard | SoC, RAM\nBattery | Cell | *\nBackplate`,
  axonometricPlan: `Room,x,y,w,h\nLiving,0,0,4,3\nBed,4,0,3,3\nKitchen,0,3,3,2\nBath,3,3,1,2\nBalcony,0,5,7,1`,
  sequence: `actor: User\nactor: System\nactor: Payment\nmsg: User -> System | Login\nmsg: System -> Payment | Charge\nmsg: Payment -> System | Result\nmsg: System -> User | Redirect`,
  groupedBar: `Model,Accuracy,Recall,F1\nBaseline,0.78,0.74,0.76\nMethodA,0.86,0.83,0.84\nMethodB,0.91,0.88,0.89\nMethodC,0.94,0.92,0.93`,
  errorLine: `Epoch,Model A,Model A SEM,Model B,Model B SEM\n10,0.55,0.04,0.50,0.05\n20,0.70,0.03,0.66,0.04\n30,0.80,0.03,0.78,0.03\n40,0.86,0.02,0.85,0.03\n50,0.90,0.02,0.89,0.02\n60,0.93,0.02,0.92,0.02`,
  boxplot: `Group,Value\nControl,12.1\nControl,11.8\nControl,12.5\nControl,11.5\nControl,12.0\nControl,13.0\nControl,11.2\nExp,15.2\nExp,14.8\nExp,16.1\nExp,15.0\nExp,15.6\nExp,14.2\nExp,16.5\nExp,15.9`,
  stackedBar: `Quarter,Product A,Product B,Product C\nQ1,120,80,40\nQ2,135,110,55\nQ3,148,130,70\nQ4,160,150,90`,
  violin: `Group,Value\nControl,12.1\nControl,11.8\nControl,12.5\nControl,11.5\nControl,12.0\nControl,13.0\nControl,11.2\nControl,12.8\nControl,11.9\nExp,15.2\nExp,14.8\nExp,16.1\nExp,15.0\nExp,15.6\nExp,14.2\nExp,16.5\nExp,15.9\nExp,17.0\nExp,14.6`,
  ecdf: `Baseline,Method A,Method B\n0.72,0.85,0.80\n0.75,0.87,0.83\n0.70,0.84,0.81\n0.78,0.90,0.86\n0.73,0.88,0.82\n0.76,0.91,0.85\n0.71,0.86,0.79\n0.74,0.89,0.84`,
  bubble: `Region,x,y,Size,Class\nEast,30,80,200,Class1\nNorth,45,60,120,Class1\nSouth,60,75,300,Class2\nSW,20,40,90,Class2\nNE,55,35,150,Class1\nNW,70,55,80,Class3\nCentral,40,65,180,Class2\nSE,50,85,260,Class3`,
  density2d: `Temp,Humidity\n22,55\n24,60\n23,58\n26,68\n28,72\n25,62\n30,80\n27,66\n29,75\n31,82\n24,57\n26,64\n33,88\n32,85\n28,70\n25,59\n30,78\n27,63\n34,90\n29,77\n23,56\n35,92\n31,84\n26,67\n28,73`,
};

/** 按语言取示例数据集。 */
export function samplesFor(lang: 'zh' | 'en'): Record<ChartType, string> {
  return lang === 'en' ? SAMPLES_EN : SAMPLES;
}

/** 参考线 / 参考带（对标 Datawrapper / Tableau）：可开关、可拖动、可改样式。 */
export interface ChartReference {
  id: string;
  axis: 'x' | 'y';
  value: number;
  value2?: number;
  label?: string;
  color?: string;
  dashed?: boolean;
  width?: number;
  opacity?: number;
  show?: boolean;
}

export interface RenderOptions {
  type: ChartType;
  csv?: string;
  fishboneJson?: string;
  title?: string;
  themeId?: string;
  accent?: string;
  accent2?: string;
  font?: string;
  usl?: number | null;
  lsl?: number | null;
  subgroup?: number;
  bins?: number;
  w?: number;
  h?: number;
  lang?: 'zh' | 'en';
  showTitle?: boolean;
  dataLabels?: boolean;
  legend?: 'right' | 'bottom' | 'none';
  /** 帕累托图：是否显示累计 % 折线（黄线），默认 true */
  cumulative?: boolean;
  /** 参考线 / 参考带列表（可拖动、可开关） */
  references?: ChartReference[];
  /** 网格线开关：major 默认 true，minor 默认 false */
  gridlines?: { major?: boolean; minor?: boolean };
  /** 趋势线：show 是否显示，type 线性/二次，ci 是否显示置信区间带 */
  trend?: { show?: boolean; type?: 'linear' | 'poly2'; ci?: boolean };
  /** 误差线（当数据含 ± 值时显示） */
  errorBars?: boolean;
  /** 四分位带（中位数+四分位区间） */
  quartileBand?: boolean;
  /** 图例中被隐藏的系列名 */
  hiddenSeries?: string[];
  /** 是否启用交互式图例（点击隐藏系列） */
  interactiveLegend?: boolean;
}

/** 渲染器返回的绘图区元数据，供 React 叠加层定位拖动把手与交互元素。 */
export interface PlotMeta {
  x: number; y: number; w: number; h: number;
  xMin: number; xMax: number; yMin: number; yMax: number;
  xType: 'linear' | 'category' | 'time';
  yType: 'linear' | 'time';
  series?: { name: string; color: string; shape: 'rect' | 'line' | 'circle' }[] | null;
  aux?: any;
}

export interface RenderResult {
  svg?: string;
  plot?: PlotMeta;
  error?: string;
  recommended?: { type: ChartType; reason: string };
}

function numOrNull(v: string): number | null {
  const t = (v || '').trim();
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}

/** 核心渲染：返回自包含 SVG 字符串，或在出错时返回 error。服务端/客户端均可用。 */
export function renderChart(opts: RenderOptions): RenderResult {
  const themeId = opts.themeId || 'light';
  const theme =
    themeId === 'brand'
      ? makeBrandTheme({ accent: opts.accent || '#2F6FED', accent2: opts.accent2 || '#F5803E', font: opts.font || "'Inter',Arial,sans-serif" })
      : (THEMES as any)[themeId] || THEMES.light;
  const lang = opts.lang || 'zh';

  try {
    if (opts.type === 'fishbone') {
      const data = JSON.parse(opts.fishboneJson || '{}');
      return { svg: renderFishbone(data, theme, { title: opts.title || (lang === 'en' ? DEFAULT_TITLES_EN.fishbone : DEFAULT_TITLES.fishbone), w: opts.w, h: opts.h, lang }) };
    }

    const o = {
      title: opts.title || (lang === 'en' ? DEFAULT_TITLES_EN[opts.type] : DEFAULT_TITLES[opts.type]),
      subtitle: '',
      usl: opts.usl ?? null,
      lsl: opts.lsl ?? null,
      bins: opts.bins || 0,
      w: opts.w,
      h: opts.h,
      lang,
      showTitle: opts.showTitle !== false,
      dataLabels: opts.dataLabels !== false,
      legend: opts.legend || 'none',
      cumulative: opts.cumulative !== false,
      references: opts.references || [],
      gridlines: opts.gridlines || { major: true, minor: false },
      trend: opts.trend || null,
      errorBars: !!opts.errorBars,
      quartileBand: !!opts.quartileBand,
      hiddenSeries: opts.hiddenSeries || [],
      interactiveLegend: !!opts.interactiveLegend,
    };

    // 图型（节点+连线 / DSL 驱动）：直接调用对应渲染器，跳过 CSV 解析分支。
    const diagramFn = DIAGRAM_RENDERERS[opts.type as string];
    if (diagramFn) {
      return { svg: diagramFn(opts.csv || '', theme, o) };
    }

    const table = parseTable(opts.csv || '');
    if (!table.columns.length) return { error: '请先输入数据（CSV，首行为表头）' };
    const payload = buildPayload(table, opts.type);
    let rendered: any = '';
    switch (opts.type) {
      case 'pareto': rendered = renderPareto(payload, theme, o); break;
      case 'bar': rendered = renderBar(payload, theme, o); break;
      case 'scatter': rendered = renderScatter(payload.xs, payload.ys, theme, { ...o, xLabel: payload.xLabel, yLabel: payload.yLabel }); break;
      case 'histogram': rendered = renderHistogram(payload.values, theme, o); break;
      case 'control': rendered = renderControl(payload.values, theme, o); break;
      case 'xbarR': {
        const v = numericColumns(table)[0].values.slice();
        rendered = renderXbarR(v, theme, { ...o, subgroup: opts.subgroup || 0 });
        break;
      }
      case 'p': {
        const nums = numericColumns(table);
        const d = nums.length >= 3 ? nums[nums.length - 2].values.slice() : nums[0].values.slice();
        const sz = nums.length >= 2 ? nums[nums.length - 1].values.slice() : d.map(() => 100);
        rendered = renderP(d, sz, theme, o);
        break;
      }
      case 'c': {
        const v = numericColumns(table)[0].values.slice();
        rendered = renderC(v, theme, o);
        break;
      }
      case 'capability': {
        const v = numericColumns(table)[0].values.slice();
        rendered = renderCapability(v, theme, { ...o, usl: opts.usl, lsl: opts.lsl });
        break;
      }
      case 'line': rendered = renderLine(payload.points, theme, o); break;
      case 'ewma':
      case 'cusum':
      case 'run': {
        const v = numericColumns(table)[0].values.slice();
        if (opts.type === 'ewma') rendered = renderEwma(v, theme, o);
        else if (opts.type === 'cusum') rendered = renderCusum(v, theme, o);
        else rendered = renderRun(v, theme, o);
        break;
      }
      case 'np': {
        const nums = numericColumns(table);
        const d = nums.length >= 2 ? nums[nums.length - 2].values.slice() : nums[0].values.slice();
        const sz = nums.length >= 2 ? nums[nums.length - 1].values.slice() : d.map(() => 100);
        rendered = renderNp(d, sz, theme, o);
        break;
      }
      case 'u': {
        const nums = numericColumns(table);
        const c = nums[0].values.slice();
        const sz = nums.length >= 2 ? nums[nums.length - 1].values.slice() : c.map(() => 1);
        rendered = renderU(c, sz, theme, o);
        break;
      }
      case 'msa': {
        const nums = numericColumns(table);
        const cats = categoricalColumns(table);
        const opCol = cats[0] || { values: nums[0].values.map(() => 'A') };
        const partCol = cats[1] || { values: nums[0].values.map((_, i) => String(i + 1)) };
        const valCol = nums[0];
        const data = valCol.values.map((v, i) => ({ op: String(opCol.values[i] ?? 'A'), part: String(partCol.values[i] ?? (i + 1)), val: v }));
        rendered = renderMsa(data, theme, o);
        break;
      }
      case 'groupedBar': {
        const cols = table.columns;
        const catCol = cols[0];
        const numCols = cols.slice(1).filter((c: any) => c.type === 'numeric');
        const categories = catCol.values.map(String);
        const series = numCols.map((c: any) => ({ name: c.name, values: c.values }));
        rendered = renderGroupedBar({ categories, series }, theme, o);
        break;
      }
      case 'errorLine': {
        const cols = table.columns;
        const xNumeric = cols[0].type === 'numeric';
        const rest = cols.slice(1);
        const series: any[] = [];
        let cur: any = null;
        for (const c of rest) {
          if (/err|误差|error|±|\bsd\b|\bsem\b/i.test(c.name)) {
            if (cur) cur.errors = c.values;
            else { cur = { name: c.name, values: c.values.map(() => 0), errors: c.values }; series.push(cur); }
          } else {
            cur = { name: c.name, values: c.values, errors: c.values.map(() => 0) };
            series.push(cur);
          }
        }
        rendered = renderErrorLine({ xType: xNumeric ? 'linear' : 'category', xs: cols[0].values, series }, theme, o);
        break;
      }
      case 'boxplot': {
        const cols = table.columns;
        const catCol = cols[0];
        const numCols = cols.filter((c: any) => c.type === 'numeric');
        let groups: any[];
        if (catCol.type === 'numeric') {
          groups = numCols.map((c: any) => ({ name: c.name, values: c.values }));
        } else {
          const map = new Map<string, number[]>();
          catCol.values.forEach((g: any, i: number) => {
            const k = String(g);
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(numCols[0].values[i]);
          });
          groups = Array.from(map, ([name, values]) => ({ name, values }));
        }
        rendered = renderBoxplot({ groups }, theme, o);
        break;
      }
      case 'stackedBar': {
        const cols = table.columns;
        const catCol = cols[0];
        const numCols = cols.slice(1).filter((c: any) => c.type === 'numeric');
        const categories = catCol.values.map(String);
        const series = numCols.map((c: any) => ({ name: c.name, values: c.values }));
        rendered = renderStackedBar({ categories, series }, theme, o);
        break;
      }
      case 'violin': {
        const cols = table.columns;
        const catCol = cols[0];
        const numCols = cols.filter((c: any) => c.type === 'numeric');
        let groups: any[];
        if (catCol.type === 'numeric') {
          groups = numCols.map((c: any) => ({ name: c.name, values: c.values }));
        } else {
          const map = new Map<string, number[]>();
          catCol.values.forEach((g: any, i: number) => {
            const k = String(g);
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(numCols[0].values[i]);
          });
          groups = Array.from(map, ([name, values]) => ({ name, values }));
        }
        rendered = renderViolin({ groups }, theme, o);
        break;
      }
      case 'ecdf': {
        const numCols = table.columns.filter((c: any) => c.type === 'numeric');
        const series = numCols.map((c: any) => ({ name: c.name, values: c.values }));
        rendered = renderECDF({ series }, theme, o);
        break;
      }
      case 'bubble': {
        const nums = numericColumns(table);
        const cats = categoricalColumns(table);
        const xs = (nums[0] || { values: [] }).values;
        const ys = (nums[1] || { values: [] }).values;
        const sizes = (nums[2] || { values: [] }).values;
        let groups: any[] = [];
        let points: any[];
        if (cats.length) {
          const gcol = cats[0];
          const names = Array.from(new Set(gcol.values.map(String)));
          groups = names.map((nm) => ({ name: nm }));
          const gi = new Map(names.map((nm, i) => [nm, i]));
          points = xs.map((x: number, i: number) => ({ x, y: ys[i], size: sizes[i], g: gi.get(String(gcol.values[i])) }));
        } else {
          points = xs.map((x: number, i: number) => ({ x, y: ys[i], size: sizes[i], g: 0 }));
        }
        rendered = renderBubble({ points, groups }, theme, o);
        break;
      }
      case 'density2d': {
        const nums = numericColumns(table);
        const xs = (nums[0] || { values: [] }).values;
        const ys = (nums[1] || { values: [] }).values;
        rendered = renderDensity2D({ xs, ys }, theme, o);
        break;
      }
      default: return { error: '未知图型' };
    }
    const out: RenderResult = {};
    if (rendered && typeof rendered === 'object' && rendered.svg) {
      out.svg = rendered.svg;
      if (rendered.plot) out.plot = rendered.plot;
    } else {
      out.svg = rendered;
    }
    return out;
  } catch (e: any) {
    return { error: e?.message || '渲染失败' };
  }
}

export { THEMES, THEME_LIST, makeBrandTheme, checkContrast, recommend };
export type { ChartType as TChartType };
