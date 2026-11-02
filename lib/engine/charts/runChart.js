// 运行图 Run Chart：中位数参考线 + 非随机信号（漂移≥6 同侧 / 趋势≥5 连升连降）。
import { svgOpen, svgClose, line, circle, path, niceScale, scale, spcAxes, yGrid, xLabels } from '../base.js';
import { runChart } from './spc.js';

export function renderRun(values, theme, opts = {}) {
  const W = opts.w || 880, H = opts.h || 520;
  const r = runChart(values);
  const yScale = niceScale(Math.min(...values), Math.max(...values), 6);
  const m = { top: 64, right: 64, bottom: 64, left: 72 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const L = opts.lang === 'en';
  const yOf = scale(yScale.min, yScale.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / values.length) * pw;
  let s = svgOpen(W, H, theme);
  s += spcAxes(W, H, theme, { ...opts, subtitle: opts.subtitle || (L ? `Median=${r.med.toFixed(3)}` : `中位数=${r.med.toFixed(3)}`) }).s;
  s += yGrid(m, pw, ph, yScale, theme);

  // 中位数参考线
  s += line(m.left, yOf(r.med), m.left + pw, yOf(r.med), theme, { color: theme.accent, width: 1.5, dash: '4 4' });

  // 数据连线 + 点（信号点高亮）
  let dp = `M${xOf(0)} ${yOf(values[0])}`;
  values.forEach((v, i) => { if (i > 0) dp += ` L${xOf(i)} ${yOf(v)}`; });
  s += path(dp, { stroke: theme.accent, sw: 2 });
  values.forEach((v, i) => {
    const has = r.flags[i].length > 0;
    s += circle(xOf(i), yOf(v), has ? 5 : 3, has ? theme.accent2 : theme.accent);
  });

  s += xLabels(m, pw, ph, values.map((_, i) => i + 1), theme);
  s += svgClose();
  return s;
}
