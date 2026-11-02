// ===========================================================================
// boxedge.js — "节点 + 连线" 图家族引擎（继承 diagram-design 编辑级风格）。
// 一个 renderGraph 通过 mode 驱动多种图型，类型间仅配置不同：
//   graph  : 分层图（LR/TB）—— 架构/流程/状态机/部署/数据流/依赖/IT现状/高层/DP集成
//   radial : 环形（hub + stations）—— 循环 flywheel / loop
//   container: 包含式外框 —— 嵌套 nested
//   bands  : 水平分层带 —— 层级 stack / 奖章 medallion / 泳道 swimlane
//   tree   : 竖直树 —— 树 tree / 组织图 org-chart
// 所有类型最终都回到 shapes.js 的 nodeBox / connector（发丝线、正交折角、克制强调色）。
// 解析统一用 diagramParser 的 "类 Mermaid" DSL。
// ===========================================================================
import { svgOpen, svgClose, text, line, rect, esc } from '../base.js';
import {
  expandTheme, arrowDefs, nodeBox, connector, band, measureNode,
} from '../diagrams/shapes.js';
import { parseDiagram } from '../data/diagramParser.js';
import { layeredLayout } from '../diagrams/layout.js';

let _id = 0;
const uid = () => `cf${(++_id).toString(36)}`;

function measureAll(nodes, t) {
  for (const n of nodes) {
    const m = measureNode({ label: n.label, sub: n.sub, shape: n.shape, theme: t });
    n.w = m.w; n.h = m.h;
  }
}

function titleBlock(opts, t, W) {
  let s = '';
  const showTitle = opts.showTitle !== false;
  if (showTitle) {
    s += text(80, 40, esc(opts.title || ''), t, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(80, 58, esc(opts.subtitle), t, { size: 12, color: t.muted });
  }
  return { s, top: showTitle ? 92 : 36 };
}

// 分层图：LR / TB
function renderGraphMode(dsl, theme, opts, cfg) {
  const t = expandTheme(theme);
  const { nodes, edges } = parseDiagram(dsl);
  if (!nodes.length) return emptySvg(opts, t, cfg);
  measureAll(nodes, t);
  const dir = cfg.dir || 'LR';
  const gap = cfg.gap || 72;
  const { s: titleS, top } = titleBlock(opts, t);
  const idp = uid();
  layeredLayout(nodes, edges, { dir, gap, startX: 90, startY: top + 20, theme: t });

  // 计算包围盒
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const n of nodes) {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
  }
  const W = opts.w || Math.ceil((maxX + 50) / 4) * 4;
  const H = opts.h || Math.ceil((maxY + 60) / 4) * 4;
  const map = new Map(nodes.map((n) => [n.id, n]));

  const anchor = (s, d) => {
    if (dir === 'LR') {
      if (d.cx >= s.cx) return { x1: s.x + s.w, y1: s.cy, x2: d.x, y2: d.cy, v: false };
      return { x1: s.x, y1: s.cy, x2: d.x + d.w, y2: d.cy, v: false };
    }
    if (d.cy >= s.cy) return { x1: s.cx, y1: s.y + s.h, x2: d.cx, y2: d.y, v: true };
    return { x1: s.cx, y1: s.y, x2: d.cx, y2: d.y + d.h, v: true };
  };

  let s = svgOpen(W, H, theme) + titleS + arrowDefs(idp, t);
  // 先画边（在节点之下）
  for (const e of edges) {
    const sN = map.get(e.from), dN = map.get(e.to);
    if (!sN || !dN) continue;
    const a = anchor(sN, dN);
    s += connector(a.x1, a.y1, a.x2, a.y2, idp, t, {
      accent: e.accent, dashed: e.dashed, label: e.label, vertical: a.v,
    });
  }
  // 再画节点
  for (const n of nodes) {
    s += nodeBox(n.x, n.y, { label: n.label, sub: n.sub, role: n.role, shape: n.shape, theme: t }).svg;
  }
  return s + svgClose();
}

// 环形（hub + stations）—— loop / flywheel
function renderRadialMode(dsl, theme, opts, cfg) {
  const t = expandTheme(theme);
  const { nodes, edges } = parseDiagram(dsl);
  if (!nodes.length) return emptySvg(opts, t, cfg);
  measureAll(nodes, t);
  const { s: titleS, top } = titleBlock(opts, t);
  const idp = uid();
  const W = opts.w || 900, H = opts.h || 620;
  const cx = W / 2, cy = top + (H - top) / 2 + 10;
  const R = Math.min(W, H - top) * 0.34;
  const stations = nodes.filter((n) => n.role !== 'focal' && n.shape !== 'circle');
  const hub = nodes.find((n) => n.shape === 'circle' || n.role === 'focal') || nodes[0];
  const others = nodes.filter((n) => n !== hub);
  const n2 = others.length;
  others.forEach((n, i) => {
    const ang = -Math.PI / 2 + (i / n2) * Math.PI * 2;
    n.cx = cx + R * Math.cos(ang);
    n.cy = cy + R * Math.sin(ang);
    n.x = n.cx - n.w / 2; n.y = n.cy - n.h / 2;
  });
  if (hub) { hub.cx = cx; hub.cy = cy; hub.x = cx - hub.w / 2; hub.y = cy - hub.h / 2; }

  let s = svgOpen(W, H, theme) + titleS + arrowDefs(idp, t);
  // hub → stations
  for (const n of others) {
    s += connector(hub.cx, hub.cy, n.cx, n.cy, idp, t, { accent: true, label: '' });
  }
  for (const n of nodes) {
    s += nodeBox(n.x, n.y, { label: n.label, sub: n.sub, role: n.role, shape: n.shape, theme: t }).svg;
  }
  return s + svgClose();
}

// 包含式外框 —— nested
function renderContainerMode(dsl, theme, opts, cfg) {
  const t = expandTheme(theme);
  const { nodes, edges } = parseDiagram(dsl);
  if (!nodes.length) return emptySvg(opts, t, cfg);
  measureAll(nodes, t);
  const { s: titleS, top } = titleBlock(opts, t);
  const idp = uid();
  const dir = 'LR';
  layeredLayout(nodes, edges, { dir, gap: 64, startX: 110, startY: top + 30, theme: t });
  let maxX = -1e9, maxY = -1e9;
  for (const n of nodes) { maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h); }
  const W = opts.w || Math.ceil((maxX + 60) / 4) * 4;
  const H = opts.h || Math.ceil((maxY + 70) / 4) * 4;
  let s = svgOpen(W, H, theme) + titleS + arrowDefs(idp, t);
  // 外框
  s += `<rect x="60" y="${top + 6}" width="${W - 120}" height="${H - top - 56}" rx="10" fill="${t.paper2}" opacity="0.35" stroke="${t.rule}" stroke-width="1"/>`;
  s += text(76, top + 24, (cfg.scopeLabel || 'Scope'), t, { size: 10, color: t.muted, weight: '600' });
  const map = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const sN = map.get(e.from), dN = map.get(e.to);
    if (!sN || !dN) continue;
    s += connector(sN.x + sN.w, sN.cy, dN.x, dN.cy, idp, t, { accent: e.accent, dashed: e.dashed, label: e.label });
  }
  for (const n of nodes) {
    s += nodeBox(n.x, n.y, { label: n.label, sub: n.sub, role: n.role, shape: n.shape, theme: t }).svg;
  }
  return s + svgClose();
}

// 水平分层带 —— layer stack / medallion / swimlane
function renderBandsMode(dsl, theme, opts, cfg) {
  const t = expandTheme(theme);
  const { nodes, edges } = parseDiagram(dsl);
  if (!nodes.length) return emptySvg(opts, t, cfg);
  measureAll(nodes, t);
  const { s: titleS, top } = titleBlock(opts, t);
  const idp = uid();
  const W = opts.w || 960;
  const bandH = cfg.bandH || 120;
  const bands = cfg.bands || []; // 显式分层标签；否则按 rank
  const layers = new Map();
  const rank = new Map(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length + 2; i++) {
    let ch = false;
    for (const e of edges) { if (rank.has(e.from) && rank.has(e.to) && rank.get(e.to) < rank.get(e.from) + 1) { rank.set(e.to, rank.get(e.from) + 1); ch = true; } }
    if (!ch) break;
  }
  for (const n of nodes) { const r = rank.get(n.id) || 0; if (!layers.has(r)) layers.set(r, []); layers.get(r).push(n); }
  const maxRank = Math.max(0, ...layers.keys());
  const totalH = top + (maxRank + 1) * bandH + 40;
  const H = opts.h || totalH;
  let s = svgOpen(W, H, theme) + titleS + arrowDefs(idp, t);
  let y = top;
  for (let r = 0; r <= maxRank; r++) {
    const col = (layers.get(r) || []).slice().sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const rawBand = bands[r];
    const label = (Array.isArray(rawBand) ? rawBand[opts.lang === 'en' ? 1 : 0] : rawBand) || (cfg.bandPrefix ? `${cfg.bandPrefix} ${r + 1}` : `Layer ${r + 1}`);
    s += band(y, bandH, label, t, { w: W - 120, x: 60 });
    let x = 90;
    for (const n of col) {
      n.x = x; n.y = y + (bandH - n.h) / 2; n.cx = n.x + n.w / 2; n.cy = n.y + n.h / 2;
      x += n.w + 48;
    }
    y += bandH;
  }
  const map = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const sN = map.get(e.from), dN = map.get(e.to);
    if (!sN || !dN) continue;
    s += connector(sN.cx, sN.y + sN.h, dN.cx, dN.y, idp, t, { accent: e.accent, dashed: e.dashed, label: e.label, vertical: true });
  }
  for (const n of nodes) {
    s += nodeBox(n.x, n.y, { label: n.label, sub: n.sub, role: n.role, shape: n.shape, theme: t }).svg;
  }
  return s + svgClose();
}

// 竖直树 —— tree / org-chart
function renderTreeMode(dsl, theme, opts, cfg) {
  const t = expandTheme(theme);
  const { nodes, edges } = parseDiagram(dsl);
  if (!nodes.length) return emptySvg(opts, t, cfg);
  measureAll(nodes, t);
  const { s: titleS, top } = titleBlock(opts, t);
  const idp = uid();
  const children = new Map(nodes.map((n) => [n.id, []]));
  const parents = new Map(nodes.map((n) => [n.id, null]));
  for (const e of edges) { if (children.has(e.from) && children.has(e.to)) { children.get(e.from).push(e.to); if (parents.get(e.to) === null) parents.set(e.to, e.from); } }
  const roots = nodes.filter((n) => parents.get(n.id) === null).map((n) => n.id);
  const depth = new Map();
  const dfs = (id, d) => { depth.set(id, d); for (const c of children.get(id) || []) dfs(c, d + 1); };
  roots.forEach((r) => dfs(r, 0));
  const xpos = new Map(); let leaf = 0;
  const place = (id) => {
    const ch = children.get(id) || [];
    if (!ch.length) { xpos.set(id, leaf++); }
    else { ch.forEach(place); xpos.set(id, (xpos.get(ch[0]) + xpos.get(ch[ch.length - 1])) / 2); }
  };
  roots.forEach(place);
  const colGap = cfg.colGap || 150, rowGap = cfg.rowGap || 120;
  let maxX = 0;
  for (const n of nodes) {
    n.cx = 90 + (xpos.get(n.id) || 0) * colGap;
    n.cy = top + 30 + (depth.get(n.id) || 0) * rowGap;
    n.x = n.cx - n.w / 2; n.y = n.cy - n.h / 2;
    maxX = Math.max(maxX, n.cx);
  }
  const W = opts.w || Math.ceil((maxX + 120) / 4) * 4;
  const H = opts.h || Math.ceil((top + 30 + (Math.max(0, ...depth.values()) + 1) * rowGap + 60) / 4) * 4;
  let s = svgOpen(W, H, theme) + titleS + arrowDefs(idp, t);
  const map = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const sN = map.get(e.from), dN = map.get(e.to);
    if (!sN || !dN) continue;
    s += connector(sN.cx, sN.y + sN.h, dN.cx, dN.y, idp, t, { accent: e.accent, dashed: e.dashed, label: e.label, vertical: true });
  }
  for (const n of nodes) {
    s += nodeBox(n.x, n.y, { label: n.label, sub: n.sub, role: n.role, shape: n.shape, theme: t }).svg;
  }
  return s + svgClose();
}

function emptySvg(opts, t, cfg) {
  const W = opts.w || 600, H = opts.h || 300;
  let s = svgOpen(W, H, t);
  const { s: titleS } = titleBlock(opts, t);
  s += titleS;
  s += text(W / 2, H / 2, opts.lang === 'en' ? '(Please enter nodes and connectors)' : '（请输入节点与连线数据）', t, { size: 12, color: t.muted, anchor: 'middle' });
  return s + svgClose();
}

// ---------------------------------------------------------------------------
// 类型配置表 + 对外渲染函数
// ---------------------------------------------------------------------------
const CFG = {
  architecture: { dir: 'LR', gap: 78 },
  architectureDelta: { dir: 'LR', gap: 78 },
  itState: { dir: 'LR', gap: 70 },
  highLevel: { dir: 'LR', gap: 80 },
  deployment: { dir: 'LR', gap: 78 },
  dpIntegration: { dir: 'LR', gap: 70 },
  flowchart: { dir: 'TB', gap: 64 },
  process: { dir: 'LR', gap: 80 },
  dataFlow: { dir: 'LR', gap: 80 },
  dependency: { dir: 'LR', gap: 72 },
  state: { dir: 'LR', gap: 80 },
  swimlane: { dir: 'LR', gap: 80 },
  nested: { mode: 'container', scopeLabel: 'Scope' },
  loop: { mode: 'radial' },
  layerStack: { mode: 'bands', bandH: 120 },
  medallion: { mode: 'bands', bandH: 120, bands: [['Bronze 铜', 'Bronze'], ['Silver 银', 'Silver'], ['Gold 金', 'Gold']] },
  tree: { mode: 'tree', colGap: 160, rowGap: 130 },
  orgChart: { mode: 'tree', colGap: 170, rowGap: 130 },
  wardley: { mode: 'bands', bandH: 110, bands: [['Genesis 创生', 'Genesis'], ['Custom 定制', 'Custom'], ['Product 产品化', 'Product'], ['Commodity 商品化', 'Commodity']] },
};

const MODE_OF = {
  graph: renderGraphMode, radial: renderRadialMode, container: renderContainerMode,
  bands: renderBandsMode, tree: renderTreeMode,
};

function renderBoxEdge(text, theme, opts, type) {
  const cfg = CFG[type] || { dir: 'LR' };
  const mode = cfg.mode || 'graph';
  const fn = MODE_OF[mode] || renderGraphMode;
  return fn(text || '', theme, opts, cfg);
}

// 对外：每个图型一个命名函数，便于 charts.ts 注册
export const renderArchitecture = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'architecture');
export const renderArchitectureDelta = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'architectureDelta');
export const renderItState = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'itState');
export const renderHighLevel = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'highLevel');
export const renderDeployment = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'deployment');
export const renderDpIntegration = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'dpIntegration');
export const renderFlowchart = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'flowchart');
export const renderProcess = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'process');
export const renderDataFlow = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'dataFlow');
export const renderDependency = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'dependency');
export const renderState = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'state');
export const renderSwimlane = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'swimlane');
export const renderNested = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'nested');
export const renderLoop = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'loop');
export const renderLayerStack = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'layerStack');
export const renderMedallion = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'medallion');
export const renderTree = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'tree');
export const renderOrgChart = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'orgChart');
export const renderWardley = (text, theme, opts) => renderBoxEdge(text, theme, opts, 'wardley');
