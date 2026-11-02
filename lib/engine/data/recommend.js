// 智能选图：按数据形态推荐最合适的图表类型，并把表映射到该图所需的数据结构
import { numericColumns, categoricalColumns } from './parser.js';

/**
 * 推荐逻辑（数据驱动而非菜单驱动）：
 *   类别 + 数值  → 柏拉图（类别多且数值似频数）/ 柱状图
 *   两个数值     → 散布图
 *   单个数值序列 → 直方图（看分布）/ 控制图（看过程稳定）
 *   时间 + 数值  → 折线图
 */
export function recommend(table) {
  const nums = numericColumns(table);
  const cats = categoricalColumns(table);
  if (nums.length >= 2) {
    return { type: 'scatter', reason: '检测到 2 个数值列，适合用散布图判断相关性' };
  }
  if (cats.length >= 1 && nums.length >= 1) {
    if (cats[0].values.length <= 12) return { type: 'pareto', reason: '类别 + 数值，且类别较少，优先柏拉图/帕累托' };
    return { type: 'bar', reason: '类别较多，用柱状图更清晰' };
  }
  if (nums.length === 1) {
    const n = nums[0].values.length;
    if (n >= 20) return { type: 'histogram', reason: '单个数值列且样本较多，先看分布（直方图）' };
    return { type: 'control', reason: '单个数值序列，用控制图看过程是否稳定' };
  }
  return { type: 'bar', reason: '默认柱状图' };
}

/** 把表映射成指定图表类型所需的数据载荷。 */
export function buildPayload(table, type) {
  const nums = numericColumns(table);
  const cats = categoricalColumns(table);
  switch (type) {
    case 'pareto':
    case 'bar': {
      const cat = cats[0] || { name: '类别', values: table.columns[0].values.map((_, i) => '项' + (i + 1)) };
      const val = nums[0] || table.columns[1] || table.columns[0];
      return { categories: cat.values.slice(), values: (val.values).slice() };
    }
    case 'scatter': {
      const x = nums[0], y = nums[1] || nums[0];
      return { xs: x.values.slice(), ys: y.values.slice(), xLabel: x.name, yLabel: y.name };
    }
    case 'histogram':
    case 'control': {
      const v = nums[0] || table.columns[0];
      return { values: v.values.slice() };
    }
    case 'line': {
      const y = nums[nums.length - 1];
      const xCol = table.columns[0];
      const x = xCol.type === 'numeric'
        ? xCol
        : { name: xCol.name, values: y.values.map((_, i) => i + 1) };
      return { points: x.values.map((xv, i) => ({ x: xv, y: y.values[i] })) };
    }
    default:
      return {};
  }
}
