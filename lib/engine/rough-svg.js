// ===========================================================================
// rough-svg.js — 把 rough.js 的 sketchy 渲染接入我们的 SVG 引擎。
// 关键思路：rough 不改坐标系，只把普通 path 画成手绘笔触，因此只需在
// base.js 的原语（line/rect/circle）里"过一道 rough"，全部图自动获得手绘风，
// 无需重写任何渲染器。rough.generator() 纯算法、无 DOM 依赖，适配 SSR。
// ===========================================================================
import rough from 'roughjs';

let _gen = null;
function gen() {
  if (!_gen) _gen = rough.generator();
  return _gen;
}

function f(n) { return Math.round(n * 100) / 100; }

/** 把 rough 的 path 操作（move/lineTo/bcurveTo）转成 SVG path 的 d 字符串。 */
function opsToPath(ops) {
  let d = '';
  for (const op of ops) {
    if (op.op === 'move') d += `M ${f(op.data[0])} ${f(op.data[1])} `;
    else if (op.op === 'lineTo') d += `L ${f(op.data[0])} ${f(op.data[1])} `;
    else if (op.op === 'bcurveTo') d += `C ${f(op.data[0])} ${f(op.data[1])} ${f(op.data[2])} ${f(op.data[3])} ${f(op.data[4])} ${f(op.data[5])} `;
  }
  return d.trim();
}

/** 把一个 drawable 转成若干 <path>（轮廓 + 可选 hachure 填充）。 */
function roughToSvg(drawable, stroke, fill, sw) {
  let s = '';
  for (const set of drawable.sets) {
    const d = opsToPath(set.ops);
    if (set.type === 'path') {
      s += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      s += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${Math.max(0.8, sw * 0.5)}" stroke-linecap="round" opacity="0.5"/>`;
    }
  }
  return s;
}

const BASE = { roughness: 1.2, bowing: 0.9, fillStyle: 'hachure', hachureGap: 7, fillWeight: 1.1 };

export function roughLine(x1, y1, x2, y2, opts = {}) {
  const color = opts.color || '#1f2430';
  const sw = opts.width || 1;
  const d = gen().line(x1, y1, x2, y2, { ...BASE, stroke: 'none', fill: 'none' });
  return roughToSvg(d, color, color, sw);
}

export function roughRect(x, y, w, h, opts = {}) {
  const stroke = opts.stroke || '#1f2430';
  const fill = opts.fill && opts.fill !== 'none' ? opts.fill : 'none';
  const sw = opts.sw || 1;
  const d = gen().rectangle(x, y, w, h, { ...BASE, stroke: 'none', fill });
  return roughToSvg(d, stroke, fill === 'none' ? stroke : fill, sw);
}

export function roughCircle(cx, cy, r, fill, opts = {}) {
  const stroke = opts.stroke || '#1f2430';
  const sw = opts.sw || 1;
  const fd = fill && fill !== 'none' ? fill : 'none';
  const d = gen().circle(cx, cy, r, { ...BASE, stroke: 'none', fill: fd });
  return roughToSvg(d, stroke, fd === 'none' ? stroke : fd, sw);
}
