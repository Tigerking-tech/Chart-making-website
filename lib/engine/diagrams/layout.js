// ===========================================================================
// layout.js — 分层图布局（Sugiyama 简化版）。
// 用"最长路径"给每个节点定层级(rank)，再按列(LR)或行(TB)分配坐标。
// 返回带 {x,y,w,h,cx,cy} 的节点数组；连线锚点由 renderGraph 自行计算。
// ===========================================================================
import { measureNode } from './shapes.js';

export function layeredLayout(nodes, edges, opts = {}) {
  const dir = opts.dir || 'LR';
  const gap = opts.gap || 64;        // 列/行间距
  const startX = opts.startX || 0;
  const startY = opts.startY || 0;
  const t = opts.theme;

  // 1) 测量每个节点尺寸
  for (const n of nodes) {
    const m = measureNode({ label: n.label, sub: n.sub, shape: n.shape, theme: t });
    n.w = m.w; n.h = m.h;
  }

  // 2) 最长路径定 rank（处理可能的环：迭代 N 次后停止）
  const rank = new Map(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length + 2; i++) {
    let changed = false;
    for (const e of edges) {
      if (!rank.has(e.from) || !rank.has(e.to)) continue;
      if (rank.get(e.to) < rank.get(e.from) + 1) {
        rank.set(e.to, rank.get(e.from) + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // 3) 按 rank 分桶
  const layers = new Map();
  for (const n of nodes) {
    const r = rank.get(n.id) || 0;
    if (!layers.has(r)) layers.set(r, []);
    layers.get(r).push(n);
  }
  const maxRank = Math.max(0, ...layers.keys());

  if (dir === 'LR') {
    const colMaxW = [];
    for (let r = 0; r <= maxRank; r++) {
      const col = (layers.get(r) || []).slice().sort((a, b) => String(a.label).localeCompare(String(b.label)));
      colMaxW[r] = col.reduce((m, n) => Math.max(m, n.w), 0);
      layers.set(r, col);
    }
    const blockH = Math.max(1, ...[...layers.values()].map((col) =>
      col.reduce((s, n) => s + n.h, 0) + Math.max(0, col.length - 1) * gap));
    let x = startX;
    for (let r = 0; r <= maxRank; r++) {
      const col = layers.get(r);
      const maxW = colMaxW[r];
      const totalH = col.reduce((s, n) => s + n.h, 0) + Math.max(0, col.length - 1) * gap;
      let y = startY + (blockH - totalH) / 2;
      for (const n of col) {
        n.x = x + (maxW - n.w) / 2;
        n.y = y;
        n.cx = n.x + n.w / 2;
        n.cy = n.y + n.h / 2;
        y += n.h + gap;
      }
      x += maxW + gap;
    }
  } else {
    const rowH = [];
    for (let r = 0; r <= maxRank; r++) {
      const row = layers.get(r) || [];
      rowH[r] = row.reduce((m, n) => Math.max(m, n.h), 0);
    }
    let y = startY;
    for (let r = 0; r <= maxRank; r++) {
      const row = (layers.get(r) || []).slice().sort((a, b) => String(a.label).localeCompare(String(b.label)));
      const totalW = row.reduce((s, n) => s + n.w, 0) + Math.max(0, row.length - 1) * gap;
      let x = startX + (opts.blockW ? (opts.blockW - totalW) / 2 : 0);
      for (const n of row) {
        n.x = x;
        n.y = y + (rowH[r] - n.h) / 2;
        n.cx = n.x + n.w / 2;
        n.cy = n.y + n.h / 2;
        x += n.w + gap;
      }
      y += rowH[r] + gap;
    }
  }

  return nodes;
}
