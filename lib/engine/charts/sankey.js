// ===========================================================================
// sankey.js — 桑基图 / Sankey（流量-数量型）
// 设计对齐 diagram-design 的 Sankey 规范：
//   · 节点为竖条（width=12，ink 实色，无描边），高度 ∝ 通过该节点的流量
//   · 流量用填充"带状 path"（非描边连线），两端水平接入节点（三次贝塞尔，
//     两个控制点都在两列中点 x 上），带宽 ∝ 流量
//   · 无箭头（方向由左→右列序暗示）
//   · 普通流量 muted@0.18，唯一焦点流量 accent@0.28（全图仅 1 个焦点元素）
//   · 发丝线、4px 栅格、accent 克制、CJK 安全、健壮不抛错
// 布局：BFS/拓扑分层定列（源→中间→汇），列内节点按流量分配高度并通过
//       重心法减少交叉；同一节点的流出/流入 ribbon 在节点整条高度内分配，
//       保证每个竖条被 ribbon 恰好铺满。
// 输入：CSV `源,目标,流量`（逗号/制表/分号分隔均可，首行支持表头）
// ===========================================================================
import { svgOpen, svgClose, text, rect, esc } from '../base.js';
import { expandTheme, textWidth } from '../diagrams/shapes.js';

// 把 total(px) 按 weights 分配，每项至少 floor，整体四舍五入到 4px 且末项补齐到 sum=total
function allocate(total, weights, floor = 4) {
  const n = weights.length;
  if (n === 0) return [];
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  let hs = weights.map((w) => (total * w) / wsum);
  // 保底厚度（避免不可见的发丝带）
  let deficit = 0;
  hs = hs.map((h) => {
    if (h < floor) { deficit += floor - h; return floor; }
    return h;
  });
  if (deficit > 0) {
    const others = hs.reduce((a, h, i) => (weights[i] > 0 && h > floor ? a + h : a), 0);
    if (others > deficit) {
      hs = hs.map((h, i) => (weights[i] > 0 && h > floor) ? h - deficit * (h / others) : h);
    }
  }
  // 4px 栅格 + 末项补齐
  hs = hs.map((h) => Math.max(floor, Math.round(h / 4) * 4));
  const sum = hs.reduce((a, b) => a + b, 0);
  const diff = total - sum;
  if (hs.length) hs[hs.length - 1] = Math.max(floor, hs[hs.length - 1] + diff);
  return hs;
}

function fmtNum(v, unit) {
  const r = Math.round(v * 100) / 100;
  const s = Math.abs(r) >= 1000 ? r.toLocaleString('en-US') : String(r);
  return unit ? `${s} ${unit}` : s;
}

export function renderSankey(data, theme, opts = {}) {
  const showTitle = opts.showTitle !== false;
  const showLegend = opts.legend !== 'none';
  const L_ = opts.lang === 'en';
  const W = opts.w || 860;
  const H = opts.h || 520;
  const t = expandTheme(theme);
  const unit = opts.unit ? String(opts.unit) : '';

  let s = svgOpen(W, H, theme);
  s += rect(0, 0, W, H, theme, { fill: theme.paper });

  if (showTitle) {
    const title = opts.title || (L_ ? 'Sankey Diagram' : '桑基图 Sankey');
    s += text(opts.left || 48, 38, title, theme, { size: 20, weight: '700', color: theme.ink });
    if (opts.subtitle) s += text(opts.left || 48, 56, opts.subtitle, theme, { size: 12, color: theme.muted });
  }

  // ---- 边距 / 绘图区 ----
  const m = {
    top: showTitle ? 104 : 80,
    right: 72,
    bottom: showLegend ? 108 : 56,
    left: 72,
  };
  const plotW = Math.max(80, W - m.left - m.right);
  const plotH = Math.max(80, H - m.top - m.bottom);
  const headerY = m.top - 30;
  const legendY = H - (showLegend ? 64 : 16);

  // ---- 解析 CSV ----
  const edges = [];
  const edgeMap = new Map();
  const nodeVal = new Map(); // name -> {in:0, out:0}
  const ensure = (n) => { if (!nodeVal.has(n)) nodeVal.set(n, { in: 0, out: 0 }); return nodeVal.get(n); };

  if (typeof data === 'string') {
    const lines = data.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter((p) => p.length);
      if (parts.length < 3) continue;
      const src = parts[0], tgt = parts[1];
      const val = parseFloat(parts[2]);
      if (!src || !tgt || src === tgt) continue;
      if (!isFinite(val) || val <= 0) continue; // 表头或非数值行
      const key = src + '||' + tgt;
      if (edgeMap.has(key)) edgeMap.get(key).value += val;
      else { const e = { source: src, target: tgt, value: val }; edgeMap.set(key, e); edges.push(e); }
      ensure(src).out += val;
      ensure(tgt).in += val;
    }
  }

  const nodeNames = Array.from(nodeVal.keys());

  // ---- 空数据兜底 ----
  if (!nodeNames.length || !edges.length) {
    const msg = L_ ? 'No valid flow data' : '暂无有效流量数据';
    s += text(m.left + plotW / 2, m.top + plotH / 2, msg, theme, { size: 14, color: theme.muted, anchor: 'middle' });
    s += svgClose();
    return s;
  }

  // ---- 拓扑分层（Kahn + 处理环） ----
  const pred = {}, succ = {};
  nodeNames.forEach((n) => { pred[n] = []; succ[n] = []; });
  edges.forEach((e) => { succ[e.source].push(e.target); pred[e.target].push(e.source); });
  const layer = {}; nodeNames.forEach((n) => (layer[n] = 0));
  const indeg = {}; nodeNames.forEach((n) => (indeg[n] = pred[n].length));
  const q = nodeNames.filter((n) => indeg[n] === 0);
  const queue = [...q];
  while (queue.length) {
    const u = queue.shift();
    for (const v of succ[u]) {
      layer[v] = Math.max(layer[v], layer[u] + 1);
      indeg[v]--;
      if (indeg[v] === 0) queue.push(v);
    }
  }
  nodeNames.forEach((n) => {
    if (indeg[n] > 0) for (const p of pred[n]) layer[n] = Math.max(layer[n], layer[p] + 1);
  });

  const L = Math.max(...Object.values(layer)) + 1;
  // 分列
  const colNodes = Array.from({ length: L }, () => []);
  nodeNames.forEach((n) => {
    const v = nodeVal.get(n);
    const val = Math.max(v.in, v.out) || 0;
    colNodes[layer[n]].push({ name: n, val, inSum: v.in, outSum: v.out, col: layer[n] });
  });
  // 初始顺序：流量降序
  colNodes.forEach((col) => col.sort((a, b) => b.val - a.val));

  // ---- 重心法减少交叉 ----
  const posMap = {};
  const buildPos = () => { colNodes.forEach((col, ci) => col.forEach((n, i) => { n.col = ci; posMap[n.name] = i; })); };
  buildPos();
  const bary = (node, otherCol) => {
    const ns = otherCol < node.col ? pred[node.name] : succ[node.name];
    if (!ns.length) return colNodes[node.col].length / 2;
    let sum = 0; ns.forEach((nn) => (sum += posMap[nn] != null ? posMap[nn] : 0));
    return sum / ns.length;
  };
  for (let it = 0; it < 4; it++) {
    for (let c = 1; c < L; c++) colNodes[c].sort((a, b) => bary(a, c - 1) - bary(b, c - 1));
    buildPos();
    for (let c = L - 2; c >= 0; c--) colNodes[c].sort((a, b) => bary(a, c + 1) - bary(b, c + 1));
    buildPos();
  }

  // ---- 比例尺 k（统一 px/单位），按最高列拟合 ----
  const vGap = 12;
  let maxColVal = 0, maxColGap = 0;
  colNodes.forEach((col) => {
    const cv = col.reduce((a, n) => a + n.val, 0);
    maxColVal = Math.max(maxColVal, cv);
    maxColGap = Math.max(maxColGap, vGap * Math.max(0, col.length - 1));
  });
  const k = maxColVal > 0 ? (plotH - maxColGap) / maxColVal : 0;

  // ---- 列 cx / 节点 y ----
  const barW = 12;
  const colCx = (c) => m.left + ((c + 0.5) / L) * plotW;
  colNodes.forEach((col, c) => {
    const cx = colCx(c);
    const colTotal = col.reduce((a, n) => a + Math.max(barW, Math.round(n.val * k / 4) * 4), 0) + vGap * Math.max(0, col.length - 1);
    let y = m.top + (plotH - colTotal) / 2;
    col.forEach((n) => {
      n.h = Math.max(barW, Math.round(n.val * k / 4) * 4);
      n.x = cx - barW / 2;
      n.y = y;
      n.cy = y + n.h / 2;
      y += n.h + vGap;
    });
  });

  // ---- 焦点流量：单条流量最大者用 accent ----
  let focal = null, maxV = -1;
  edges.forEach((e) => { if (e.value > maxV) { maxV = e.value; focal = e; } });

  // ---- 列头（eyebrow） ----
  colNodes.forEach((col, c) => {
    let head;
    if (L_){
      head = c === 0 ? 'SOURCE' : c === L - 1 ? 'SINK' : `STAGE ${c + 1}`;
    } else {
      head = c === 0 ? '源 SOURCE' : c === L - 1 ? '汇 SINK' : `阶段 ${c + 1}`;
    }
    s += text(colCx(c), headerY, head, theme, { size: 8, color: theme.muted, anchor: 'middle', weight: '600' });
  });

  // ---- ribbon 槽位分配 ----
  const outSlots = new Map(), inSlots = new Map();
  colNodes.flat().forEach((n) => {
    const outs = edges.filter((e) => e.source === n.name);
    const ins = edges.filter((e) => e.target === n.name);
    outs.sort((a, b) => posMap[b.target] - posMap[a.target]); // 流向靠下的目标排在靠下
    ins.sort((a, b) => posMap[a.source] - posMap[b.source]);
    const outH = allocate(n.h, outs.map((e) => e.value || 0));
    const inH = allocate(n.h, ins.map((e) => e.value || 0));
    let cy = n.y;
    outs.forEach((e, i) => { outSlots.set(e, { y0: cy, y1: cy + outH[i] }); cy += outH[i]; });
    cy = n.y;
    ins.forEach((e, i) => { inSlots.set(e, { y0: cy, y1: cy + inH[i] }); cy += inH[i]; });
  });

  // ---- 绘制 ribbon（先普通，后焦点，焦点压顶） ----
  const drawRibbon = (e, accent) => {
    const so = outSlots.get(e), ti = inSlots.get(e);
    if (!so || !ti) return '';
    // 同列（环造成的退化）无法画水平带，跳过
    if (layer[e.source] === layer[e.target]) return '';
    const x1 = colCx(layer[e.target]) - barW / 2;
    const sx = colCx(layer[e.source]) + barW / 2;
    const mx = (sx + x1) / 2;
    const fill = accent ? t._rgba(theme.accent, 0.28) : t._rgba(theme.muted, 0.18);
    const d = `M${sx},${so.y0} C${mx},${so.y0} ${mx},${ti.y0} ${x1},${ti.y0} ` +
              `L${x1},${ti.y1} C${mx},${ti.y1} ${mx},${so.y1} ${sx},${so.y1} Z`;
    let r = '';
    r += `<path d="${d}" fill="${fill}"/>`;
    if (opts.dataLabels) {
      const midY = (so.y0 + so.y1 + ti.y0 + ti.y1) / 4;
      const label = fmtNum(e.value, unit);
      const tw = textWidth(label, 9) + 10;
      r += rect(mx - tw / 2, midY - 8, tw, 14, theme, { fill: theme.paper, rx: 2 });
      r += text(mx, midY + 3, label, theme, { size: 9, color: theme.muted, anchor: 'middle' });
    }
    return r;
  };
  edges.forEach((e) => { if (e !== focal) s += drawRibbon(e, false); });
  if (focal) s += drawRibbon(focal, true);

  // ---- 绘制节点竖条 ----
  colNodes.flat().forEach((n) => {
    s += rect(n.x, n.y, barW, n.h, theme, { fill: theme.ink });
  });

  // ---- 节点标签 ----
  colNodes.forEach((col, c) => {
    const cx = colCx(c);
    col.forEach((n) => {
      const nameStr = n.name;
      const valStr = fmtNum(n.val, unit);
      if (c === 0) {
        const lx = n.x - 10;
        s += text(lx, n.cy - 4, nameStr, theme, { size: 12, weight: '600', color: theme.ink, anchor: 'end' });
        s += text(lx, n.cy + 13, valStr, theme, { size: 9, color: theme.muted, anchor: 'end' });
      } else if (c === L - 1) {
        const lx = n.x + barW + 10;
        s += text(lx, n.cy - 4, nameStr, theme, { size: 12, weight: '600', color: theme.ink, anchor: 'start' });
        s += text(lx, n.cy + 13, valStr, theme, { size: 9, color: theme.muted, anchor: 'start' });
      } else {
        // 中间列：标签居中于竖条上方的间隙（gutter），无需遮罩
        const ly = Math.max(headerY + 16, n.y - 12);
        s += text(cx, ly, nameStr, theme, { size: 12, weight: '600', color: theme.ink, anchor: 'middle' });
        s += text(cx, ly + 13, valStr, theme, { size: 9, color: theme.muted, anchor: 'middle' });
      }
    });
  });

  // ---- 图例 ----
  if (showLegend) {
    s += text(m.left, legendY - 12, L_ ? 'LEGEND' : '图例', theme, { size: 8, color: theme.muted, weight: '600' });
    const items = [
      { fill: t._rgba(theme.muted, 0.18), stroke: theme.muted, label: L_ ? 'Flow · stage routing' : '流量 · 阶段流转' },
      { fill: t._rgba(theme.accent, 0.28), stroke: theme.accent, label: L_ ? 'Focal flow · largest' : '重点路径 · 最大流量' },
      { fill: theme.ink, stroke: 'none', label: L_ ? 'Node · stage total' : '节点 · 阶段汇总' },
    ];
    let x = m.left + 60;
    const ry = legendY - 8;
    items.forEach((it) => {
      s += rect(x, ry, 16, 8, theme, { fill: it.fill, stroke: it.stroke, sw: it.stroke === 'none' ? 0 : 1 });
      s += text(x + 24, ry + 8, it.label, theme, { size: 9, color: theme.muted });
      x += 24 + textWidth(it.label, 9) + 28;
    });
    if (focal) {
      const pct = maxV / maxColVal * 100;
      const note = L_
        ? `The single largest flow carries ~${fmtNum(pct)}% of the total throughput.`
        : `最大单条流量约占全图总吞吐的 ${fmtNum(pct)}%。`;
      s += text(x + 8, ry + 8, note, theme, { size: 9, color: theme.muted });
    }
  }

  s += svgClose();
  return s;
}
