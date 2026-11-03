// lib/paperTemplates.ts — 原创论文图模板库
// 全部模板均由 ChartForge 自研 SVG 引擎从零绘制（算法/样式原创，不依赖任何第三方绘图库或外部脚本）。
// 每个模板是一份「图型 + CSV + 渲染选项」的可复现规格，可用于画廊预览与一键在 Studio 打开。
import type { ChartType, RenderOptions } from './charts';

export interface PaperTemplate {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  type: ChartType;
  csv: string;
  desc: string;
  lang?: 'zh' | 'en';
  showTitle?: boolean;
  dataLabels?: boolean;
  legend?: 'right' | 'bottom' | 'none';
  /** 额外的渲染选项（如趋势线、网格等），直接并入 renderChart 调用。 */
  extra?: Partial<RenderOptions>;
}

export const PAPER_CATS = [
  { key: 'all', label: '全部' },
  { key: 'groupedBar', label: '分组柱状' },
  { key: 'errorLine', label: '误差折线' },
  { key: 'scatter', label: '散点 / 拟合' },
  { key: 'radar', label: '雷达' },
  { key: 'heatmap', label: '热力图' },
  { key: 'boxplot', label: '箱线图' },
  { key: 'histogram', label: '分布直方图' },
  { key: 'composition', label: '构成 / 占比' },
  { key: 'quadrant', label: '象限' },
];

export const PAPER_TEMPLATES: PaperTemplate[] = [
  {
    id: 'grouped-bar-metrics',
    title: '算法指标对比（分组柱状）',
    category: 'groupedBar',
    categoryLabel: '分组柱状',
    type: 'groupedBar',
    desc: '同一组模型在多个指标上的并排对比，直观呈现各项优劣。多序列、带数据标签与图例。',
    csv: `模型,准确率,召回率,F1\n基线,0.78,0.74,0.76\n方法A,0.86,0.83,0.84\n方法B,0.91,0.88,0.89\n方法C,0.94,0.92,0.93`,
    legend: 'right',
    dataLabels: true,
  },
  {
    id: 'error-line-accuracy',
    title: '模型准确率随训练轮次（误差棒）',
    category: 'errorLine',
    categoryLabel: '误差折线',
    type: 'errorLine',
    desc: '多模型收敛曲线，含 ±SEM 误差棒，对标论文常见的 error-bar 折线。误差列以"误差/err/±/sd/sem"命名自动识别。',
    csv: `轮次,方法A,方法A误差,方法B,方法B误差\n10,0.55,0.04,0.50,0.05\n20,0.70,0.03,0.66,0.04\n30,0.80,0.03,0.78,0.03\n40,0.86,0.02,0.85,0.03\n50,0.90,0.02,0.89,0.02\n60,0.93,0.02,0.92,0.02`,
    legend: 'right',
  },
  {
    id: 'error-line-sales',
    title: '多产品销量三年趋势',
    category: 'errorLine',
    categoryLabel: '误差折线',
    type: 'errorLine',
    desc: '无误差列的纯多序列折线，用于时间序列 / 趋势对比。',
    csv: `年份,产品A,产品B,产品C\n2019,120,90,40\n2020,135,110,55\n2021,148,130,70\n2022,160,150,90\n2023,172,165,110\n2024,190,180,140`,
    legend: 'right',
  },
  {
    id: 'scatter-fit',
    title: '特征相关性与线性拟合',
    category: 'scatter',
    categoryLabel: '散点 / 拟合',
    type: 'scatter',
    desc: '散点 + 线性拟合趋势线 + 95% 置信带，用于相关性分析。',
    csv: `湿度,虚焊率\n30,1.2\n35,1.5\n40,2.0\n45,2.4\n50,3.1\n55,3.6\n60,4.5\n65,5.0\n70,5.8`,
    extra: { trend: { show: true, type: 'linear', ci: true } },
  },
  {
    id: 'radar-capability',
    title: '方法多维能力雷达',
    category: 'radar',
    categoryLabel: '雷达',
    type: 'radar',
    desc: '多维指标雷达对比，适合能力 / 特性画像。',
    csv: `维度,产品A,产品B\n速度,4,3\n价格,3,5\n质量,5,4\n服务,4,4\n创新,3,5`,
  },
  {
    id: 'heatmap-corr',
    title: '变量相关性热力图',
    category: 'heatmap',
    categoryLabel: '热力图',
    type: 'heatmap',
    desc: '矩阵型热力图，按数值着色，适合相关性 / 强度矩阵。',
    csv: `,Jan,Feb,Mar\n服务A,3,5,8\n服务B,2,8,1\n服务C,6,4,9`,
  },
  {
    id: 'boxplot-groups',
    title: '各组指标分布（箱线图）',
    category: 'boxplot',
    categoryLabel: '箱线图',
    type: 'boxplot',
    desc: 'Tukey 须线法：箱体=IQR，中线=中位数，须线=1.5·IQR 内最值，圆点=离群值，实心点=均值。',
    csv: `组别,数值\n对照组,12.1\n对照组,11.8\n对照组,12.5\n对照组,11.5\n对照组,12.0\n对照组,13.0\n对照组,11.2\n实验组,15.2\n实验组,14.8\n实验组,16.1\n实验组,15.0\n实验组,15.6\n实验组,14.2\n实验组,16.5\n实验组,15.9`,
  },
  {
    id: 'histogram-measure',
    title: '测量值分布（直方图）',
    category: 'histogram',
    categoryLabel: '分布直方图',
    type: 'histogram',
    desc: '连续变量频数分布，sqrt 法自动分箱。',
    csv: `厚度\n10.02\n10.05\n9.98\n10.01\n10.03\n9.97\n10.00\n10.04\n9.99\n10.02\n10.06\n9.96\n10.01\n10.03\n9.98\n10.00\n10.05\n9.99\n10.02\n10.04`,
  },
  {
    id: 'waterfall-cost',
    title: '成本构成瀑布图',
    category: 'composition',
    categoryLabel: '构成 / 占比',
    type: 'waterfall',
    desc: '累计增减分解，展示构成项如何汇聚为最终结果。',
    csv: `项目,值\n收入,200\n成本,-80\n利润,120`,
  },
  {
    id: 'treemap-market',
    title: '市场份额树图',
    category: 'composition',
    categoryLabel: '构成 / 占比',
    type: 'treemap',
    desc: '按数值面积编码的层级占比图。',
    csv: `类别,值\n亚洲,40\n非洲,25\n欧洲,20\n美洲,15`,
  },
  {
    id: 'polar-load',
    title: '月度资源负载（极坐标）',
    category: 'composition',
    categoryLabel: '构成 / 占比',
    type: 'polar',
    desc: '周期性数据的极坐标表示。',
    csv: `类别,值\n一月,30\n二月,55\n三月,42\n四月,68\n五月,90\n六月,75`,
  },
  {
    id: 'quadrant-priority',
    title: '项目优先级象限',
    category: 'quadrant',
    categoryLabel: '象限',
    type: 'quadrant',
    desc: '二维价值-难度定位，辅助优先级决策。',
    csv: `名称,x,y\n高价值高难度,8,9\n低价值高难度,2,8\n高价值低难度,9,2\n低价值低难度,2,2\n焦点项目,7,7`,
  },
];
