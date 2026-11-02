// 纯模块渲染自检：不依赖浏览器，验证统计引擎与 7 类图表能产出合法 SVG
import { renderPareto } from '../src/charts/pareto.js';
import { renderBar } from '../src/charts/bar.js';
import { renderScatter } from '../src/charts/scatter.js';
import { renderHistogram } from '../src/charts/histogram.js';
import { renderControl } from '../src/charts/controlChart.js';
import { renderLine } from '../src/charts/line.js';
import { renderFishbone } from '../src/charts/fishbone.js';
import { iMR, capability, linearRegression, histogram } from '../src/stats/stats.js';
import { THEMES } from '../src/themes/themes.js';

const theme = THEMES.light;
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name); }
}
function okSVG(svg, name) {
  check(name + ' 产出 SVG', typeof svg === 'string' && svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
}

console.log('— 图表渲染 —');
const pareto = renderPareto({ categories: ['虚焊', '漏件', '偏移', '少锡', '其他'], values: [42, 25, 15, 10, 8] }, theme);
okSVG(pareto, 'Pareto');
check('Pareto 含累计折线 path', pareto.includes('stroke') && pareto.includes('100%'));

okSVG(renderBar({ categories: ['A', 'B', 'C'], values: [3, 7, 5] }, theme), 'Bar');
okSVG(renderBar({ categories: ['A', 'B', 'C'], values: [3, 7, 5] }, theme, { horizontal: true }), 'Bar(水平)');

const sc = renderScatter([30, 35, 40, 45, 50], [1.2, 1.5, 2.0, 2.4, 3.1], theme);
okSVG(sc, 'Scatter');
check('Scatter 含回归方程文本', sc.includes('y ='));

okSVG(renderHistogram([10.0, 10.1, 9.9, 10.2, 10.0, 9.8], theme, { usl: 10.3, lsl: 9.7 }), 'Histogram(规格限)');
okSVG(renderControl([10.0, 10.1, 9.9, 10.5, 10.0, 9.8, 10.2, 9.7, 10.1, 10.0], theme), 'Control');
okSVG(renderLine([{ x: 1, y: 10 }, { x: 2, y: 12 }, { x: 3, y: 11 }], theme), 'Line');
okSVG(renderFishbone({ effect: '不良', bones: [{ category: '人', causes: ['a', 'b'] }] }, theme), 'Fishbone');

console.log('— 统计引擎 —');
const cc = iMR([10.0, 10.1, 9.9, 10.5, 10.0, 9.8, 10.2, 9.7, 10.1, 10.0]);
check('I-MR 控制限 UCL>LCL', cc.ucl > cc.lcl);
check('I-MR 含中心线', typeof cc.cl === 'number');

const reg = linearRegression([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
check('回归斜率≈2', Math.abs(reg.slope - 2) < 1e-9);
check('相关系数 r=1', Math.abs(reg.r - 1) < 1e-9);

const cap = capability([10.0, 10.1, 9.9, 10.2, 10.0, 9.8], 10.3, 9.7);
check('Cp/Cpk 有值', cap.cp != null && cap.cpk != null);

const h = histogram([1, 2, 2, 3, 3, 3, 4, 5], 4);
check('直方图分箱计数和=样本数', h.counts.reduce((a, b) => a + b, 0) === 8);

console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
process.exit(fail === 0 ? 0 : 1);
