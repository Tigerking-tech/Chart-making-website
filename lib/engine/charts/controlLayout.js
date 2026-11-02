// ===========================================================================
// controlLayout.js — 控制图通用面板绘制（单图）。被 p / c 图直接复用，
// 也被 X̄-R 图上下两个面板复用。自动继承手绘风（用 base 原语绘制）。
// ===========================================================================
import { text, line, circle, niceScale, scale } from '../base.js';
import { emitOverlay } from './overlays.js';

/**
 * 绘制一个控制图面板。
 * o: { title, subtitle, yMin, yMax, nPoints, cl, ucl, lcl, points:[{v,flag}], xLabels, m,
 *      gridlines?, references? }
 *   m 为该面板的边距（{top,right,bottom,left}），用于在同一 SVG 里排布多个面板。
 * 返回 { s, ctx }：s 为 SVG 片段，ctx 供 React 叠加层（参考线/带）定位。
 */
export function controlPanel(W, H, theme, o) {
  const m = o.m || { top: 64, right: 56, bottom: 48, left: 64 };
  const pw = W - m.left - m.right;
  const ph = H - m.top - m.bottom;
  const ys = niceScale(o.yMin, o.yMax, 6);
  const yOf = scale(ys.min, ys.max, m.top + ph, m.top);
  const xOf = (i) => m.left + ((i + 0.5) / o.nPoints) * pw;

  let s = '';
  if (o.title) s += text(m.left, m.top - 22, o.title, theme, { size: 13, weight: '700', color: theme.ink });
  if (o.subtitle) s += text(m.left, m.top - 6, o.subtitle, theme, { size: 10, color: theme.muted });

  // 水平网格 + y 轴刻度（网格线受 gridlines.major 开关，刻度标签始终显示）
  const major = o.gridlines ? o.gridlines.major !== false : true;
  ys.ticks.forEach((t) => {
    const y = yOf(t);
    if (major) s += line(m.left, y, m.left + pw, y, theme, { color: theme.grid, width: 1 });
    s += text(m.left - 8, y + 4, String(t), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  });
  // 坐标轴
  s += line(m.left, m.top, m.left, m.top + ph, theme, { color: theme.ink, width: 1 });
  s += line(m.left, m.top + ph, m.left + pw, m.top + ph, theme, { color: theme.ink, width: 1 });

  // 控制限 UCL / LCL / CL
  s += line(m.left, yOf(o.ucl), m.left + pw, yOf(o.ucl), theme, { color: theme.accent2, width: 1.5, dash: '6 4' });
  s += text(m.left + pw - 4, yOf(o.ucl) - 6, 'UCL', theme, { size: 10, color: theme.accent2, anchor: 'end' });
  s += line(m.left, yOf(o.lcl), m.left + pw, yOf(o.lcl), theme, { color: theme.accent2, width: 1.5, dash: '6 4' });
  s += text(m.left + pw - 4, yOf(o.lcl) - 6, 'LCL', theme, { size: 10, color: theme.accent2, anchor: 'end' });
  s += line(m.left, yOf(o.cl), m.left + pw, yOf(o.cl), theme, { color: theme.ink, width: 1.5, dash: '2 3' });
  s += text(m.left + 4, yOf(o.cl) - 6, 'CL', theme, { size: 10, color: theme.ink, anchor: 'start' });

  // 折线 + 点
  let d = '';
  o.points.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + xOf(i) + ' ' + yOf(p.v) + ' '; });
  s += `<path d="${d}" fill="none" stroke="${theme.muted}" stroke-width="1.5"/>`;
  o.points.forEach((p, i) => {
    const col = p.flag ? theme.accent2 : theme.accent;
    s += circle(xOf(i), yOf(p.v), p.flag ? 6 : 4, col, { stroke: theme.paper, sw: 1 });
    if (p.flag) s += text(xOf(i), yOf(p.v) - 12, '!', theme, { size: 11, color: theme.accent2, anchor: 'middle' });
  });

  // x 轴标签
  const step = Math.max(1, Math.floor(o.nPoints / 10));
  for (let i = 0; i < o.nPoints; i += step) {
    s += text(xOf(i), m.top + ph + 16, o.xLabels ? o.xLabels[i] : String(i + 1), theme, { size: 9, color: theme.gridText, anchor: 'middle' });
  }

  // 叠加层：次网格 + 参考线/带（可拖动、可开关）
  const ctx = { m, pw, ph, xOf, yOf, xType: 'category', yType: 'linear', xMin: 0, xMax: o.nPoints - 1, yMin: ys.min, yMax: ys.max, xStep: 1, yStep: ys.step };
  s += emitOverlay(ctx, o, theme);
  return { s, ctx };
}
