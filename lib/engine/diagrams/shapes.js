// ===========================================================================
// shapes.js — 编辑级图表原语（继承 diagram-design 设计铁律）
//   · 无阴影  · 发丝线(stroke 1)  · 4px 栅格  · 克制强调色
//   · 节点盒 = 不透明 paper 遮罩 + 盒体(rx=6) + 直角类型标签(rx=2) + 名称 + mono 副标签
//   · 连线 = 正交折角(r=8)，箭头画在节点之后（线在盒下）
// 全部返回 SVG 字符串，供各图表渲染器复用。
// ===========================================================================
import { esc } from '../base.js';

/** 把 ChartForge 主题扩展为 diagram 用主题（补齐 diagram-design 的语义 token）。 */
export function expandTheme(theme) {
  const ink = theme.ink || '#1f2430';
  const accent = theme.accent || '#2F6FED';
  const rgba = (hex, a) => {
    const c = String(hex).replace('#', '');
    const rgb = c.length === 3 ? c.split('').map((x) => parseInt(x + x, 16)) : [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  };
  return {
    ...theme,
    paper2: theme.grid || '#EAECEF',
    rule: rgba(ink, 0.12),
    ruleSolid: rgba(ink, 0.25),
    soft: theme.muted || '#6b7280',
    accentTint: rgba(accent, 0.08),
    link: theme.link || '#2e5aa8',
    inkStrong: '#111111',
    _rgba: rgba,
  };
}

/** 估算文本像素宽度（与 diagram-design 的字宽预算一致：CJK=1em，其他≈0.6em）。 */
export function textWidth(str, size = 12, mono = false) {
  const s = String(str);
  let w = 0;
  for (const ch of s) {
    if (/[　-鿿豈-﫿]/.test(ch)) w += size; // CJK 全角 = 1em
    else w += size * (mono ? 0.6 : 0.6);
  }
  return w;
}

/** 节点角色 → 填充/描边/虚线（对应 style-guide 的 Node type → treatment）。 */
export function treatment(role, t) {
  switch ((role || '').toLowerCase()) {
    case 'focal': return { fill: t.accentTint, stroke: t.accent, dash: null };
    case 'backend': return { fill: t.paper, stroke: t.ink, dash: null };
    case 'store': return { fill: t._rgba(t.ink, 0.05), stroke: t.muted, dash: null };
    case 'external': return { fill: t._rgba(t.ink, 0.03), stroke: t._rgba(t.ink, 0.30), dash: null };
    case 'input': return { fill: t._rgba(t.muted, 0.10), stroke: t.soft, dash: null };
    case 'optional': return { fill: t._rgba(t.ink, 0.02), stroke: t._rgba(t.ink, 0.20), dash: '4,3' };
    case 'security': return { fill: t._rgba(t.accent, 0.05), stroke: t._rgba(t.accent, 0.50), dash: '4,4' };
    default: return { fill: t.paper, stroke: t.ink, dash: null };
  }
}

/** 箭头标记定义（始终定义三个：默认/强调/链接）。idp 用于避免多图同页 ID 冲突。 */
export function arrowDefs(idp, t) {
  const mk = (id, color) => `<marker id="${idp}-${id}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="${color}"/></marker>`;
  return `<defs>${mk('arrow', t.muted)}${mk('arrow-accent', t.accent)}${mk('arrow-link', t.link)}</defs>`;
}

/** 仅测量节点盒尺寸（不渲染），供布局阶段先行计算。 */
export function measureNode(opt) {
  const t = opt.theme;
  const shape = (opt.shape || 'box').toLowerCase();
  if (shape === 'circle' || shape === 'diamond') {
    const d = opt.h || (opt.sub ? 52 : 44);
    return { w: d, h: d };
  }
  const lw = textWidth(opt.label || '', 12) + 28;
  const sw = opt.sub ? textWidth(opt.sub, 9) + 24 : 0;
  const w = opt.w || Math.max(96, Math.ceil(Math.max(lw, sw) / 4) * 4);
  const h = opt.h || (opt.sub ? 48 : 40);
  return { w, h };
}

/** 画一个节点盒。返回完整 SVG 片段。
 *  opt: { label, sub, role, shape, w?, h?, theme:t(expanded) }
 *  shape ∈ box|round|stadium|diamond|circle|cylinder
 *  返回 { svg, w, h, cx, cy } */
export function nodeBox(x, y, opt) {
  const t = opt.theme;
  const label = esc(opt.label || '');
  const sub = esc(opt.sub || '');
  const shape = (opt.shape || 'box').toLowerCase();
  const tr = treatment(opt.role, t);
  // 尺寸：根据文字自适应，向上取整到 4 的倍数
  const lw = textWidth(opt.label || '', 12) + 28;
  const sw = sub ? textWidth(opt.sub, 9) + 24 : 0;
  let w = opt.w || Math.max(96, Math.ceil(Math.max(lw, sw) / 4) * 4);
  let h = opt.h || (sub ? 48 : 40);
  if (shape === 'circle') { w = h = opt.w || opt.h || 56; }
  const cx = x + w / 2, cy = y + h / 2;
  let s = '';
  const dashAttr = tr.dash ? ` stroke-dasharray="${tr.dash}"` : '';

  if (shape === 'diamond') {
    const pts = `${cx},${y} ${x+w},${cy} ${cx},${y+h} ${x},${cy}`;
    s += `<polygon points="${pts}" fill="${t.paper}" stroke="${t.ink}" stroke-width="1"/>`;
    s += `<polygon points="${pts}" fill="${tr.fill}" stroke="${tr.stroke}" stroke-width="1"${dashAttr} opacity="0.0"/>`;
    s += `<polygon points="${pts}" fill="${tr.fill}" stroke="${tr.stroke}" stroke-width="1"${dashAttr}/>`;
    if (label) s += `<text x="${cx}" y="${cy + (sub ? -3 : 4)}" fill="${t.ink}" font-size="12" font-weight="600" font-family="${t.font}" text-anchor="middle">${label}</text>`;
    if (sub) s += `<text x="${cx}" y="${cy + 13}" fill="${t.muted}" font-size="9" font-family="${t.font}" text-anchor="middle">${sub}</text>`;
    return { svg: s, w, h, cx, cy };
  }
  if (shape === 'circle') {
    const r = w / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.paper}" stroke="${t.ink}" stroke-width="1"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tr.fill}" stroke="${tr.stroke}" stroke-width="1"${dashAttr}/>`;
    if (label) s += `<text x="${cx}" y="${cy + (sub ? -1 : 4)}" fill="${t.ink}" font-size="12" font-weight="600" font-family="${t.font}" text-anchor="middle">${label}</text>`;
    if (sub) s += `<text x="${cx}" y="${cy + 13}" fill="${t.muted}" font-size="9" font-family="${t.font}" text-anchor="middle">${sub}</text>`;
    return { svg: s, w, h, cx, cy };
  }
  // 圆柱（数据库）：上半椭圆帽
  if (shape === 'cylinder') {
    const ry = Math.min(10, h * 0.18);
    s += `<path d="M${x} ${y + ry} a ${w / 2} ${ry} 0 0 1 ${w} 0 v ${h - 2 * ry} a ${w / 2} ${ry} 0 0 1 ${-w} 0 z" fill="${t.paper}" stroke="${t.ink}" stroke-width="1"/>`;
    s += `<path d="M${x} ${y + ry} a ${w / 2} ${ry} 0 0 1 ${w} 0" fill="none" stroke="${t.ink}" stroke-width="1"/>`;
    s += `<path d="M${x} ${y + ry} a ${w / 2} ${ry} 0 0 1 ${w} 0 v ${h - 2 * ry} a ${w / 2} ${ry} 0 0 1 ${-w} 0 z" fill="${tr.fill}" stroke="${tr.stroke}" stroke-width="1"${dashAttr}/>`;
    if (label) s += `<text x="${cx}" y="${cy + (sub ? -1 : 4)}" fill="${t.ink}" font-size="12" font-weight="600" font-family="${t.font}" text-anchor="middle">${label}</text>`;
    if (sub) s += `<text x="${cx}" y="${cy + 14}" fill="${t.muted}" font-size="9" font-family="${t.font}" text-anchor="middle">${sub}</text>`;
    return { svg: s, w, h, cx, cy };
  }
  // 矩形类：box / round / stadium
  const rx = shape === 'stadium' ? h / 2 : shape === 'round' ? 12 : 6;
  // 1) 不透明 paper 遮罩（防箭头穿透） 2) 盒体
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${t.paper}"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${tr.fill}" stroke="${tr.stroke}" stroke-width="1"${dashAttr}/>`;
  // 3) 类型标签（直角 rx=2，仅当 role 明确且非默认）
  if (opt.role && !['', 'node'].includes(opt.role.toLowerCase()) && shape === 'box') {
    const tagW = 30, tagH = 12;
    s += `<rect x="${x + 8}" y="${y + 6}" width="${tagW}" height="${tagH}" rx="2" fill="transparent" stroke="${tr.stroke}" stroke-width="0.8" opacity="0.5"/>`;
    s += `<text x="${x + 8 + tagW / 2}" y="${y + 15}" fill="${tr.stroke}" font-size="7" font-family="${t.font}" text-anchor="middle" letter-spacing="0.08em" style="text-transform:uppercase" opacity="0.85">${esc((opt.role || '').slice(0, 4))}</text>`;
    s += `<text x="${cx}" y="${y + h - 12}" fill="${t.ink}" font-size="12" font-weight="600" font-family="${t.font}" text-anchor="middle">${label}</text>`;
  } else {
    s += `<text x="${cx}" y="${cy + (sub ? -1 : 4)}" fill="${t.ink}" font-size="12" font-weight="600" font-family="${t.font}" text-anchor="middle">${label}</text>`;
  }
  if (sub) s += `<text x="${cx}" y="${cy + 14}" fill="${t.muted}" font-size="9" font-family="${t.font}" text-anchor="middle">${sub}</text>`;
  return { svg: s, w, h, cx, cy };
}

/** 正交折角连线（r=8）。返回 path 的 d 属性（不含 <path> 标签）。
 *  opt.vertical=true 时走"先竖后横"（TB 布局用）；否则"先横后竖"（LR 布局用）。 */
export function elbowPath(x1, y1, x2, y2, opt = {}) {
  const r = opt.r || 8;
  if (Math.abs(x1 - x2) < 1) return `M${x1},${y1} L${x2},${y2}`;
  if (Math.abs(y1 - y2) < 1) return `M${x1},${y1} L${x2},${y2}`;
  if (opt.vertical) {
    const midY = (y1 + y2) / 2;
    return `M${x1},${y1} L${x1},${midY} Q${x1},${midY} ${x1 + (x2 > x1 ? r : -r)},${midY} ` +
      `L${x2 - (x2 > x1 ? r : -r)},${midY} Q${x2},${midY} ${x2},${midY + (y2 > y1 ? r : -r)} ` +
      `L${x2},${y2}`;
  }
  const midX = (x1 + x2) / 2;
  return `M${x1},${y1} L${midX},${y1} Q${midX},${y1} ${midX},${y1 + (y2 > y1 ? r : -r)} ` +
    `L${midX},${y2 - (y2 > y1 ? r : -r)} Q${midX},${y2} ${midX + (x2 > x1 ? r : -r)},${y2} ` +
    `L${x2},${y2}`;
}

/** 画一条带箭头的连线（含标签遮罩）。返回 SVG 片段。
 *  opt: { color, dashed, accent, link, r, label, labelColor } */
export function connector(x1, y1, x2, y2, idp, t, opt = {}) {
  const d = elbowPath(x1, y1, x2, y2, { vertical: opt.vertical, r: opt.r });
  const color = opt.accent ? t.accent : opt.link ? t.link : opt.color || t.muted;
  const marker = opt.accent ? `${idp}-arrow-accent` : opt.link ? `${idp}-arrow-link` : `${idp}-arrow`;
  const dash = opt.dashed ? ' stroke-dasharray="5,4"' : '';
  let s = `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"${dash} marker-end="url(#${marker})"/>`;
  if (opt.label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const tw = textWidth(opt.label, 8) + 12;
    const ly = my - 14; // 标签在线上方 6-10px 间隙
    s += `<rect x="${mx - tw / 2}" y="${ly - 8}" width="${tw}" height="12" rx="2" fill="${t.paper}"/>`;
    s += `<text x="${mx}" y="${ly}" fill="${opt.labelColor || t.soft}" font-size="8" font-family="${t.font}" text-anchor="middle" letter-spacing="0.06em" style="text-transform:uppercase">${esc(opt.label)}</text>`;
  }
  return s;
}

/** 水平/垂直泳道或分层带。opt: { vertical, label } */
export function band(y, h, label, t, opt = {}) {
  const W = opt.w || 1200, x = opt.x || 0;
  let s = `<rect x="${x}" y="${y}" width="${W}" height="${h}" fill="${t.paper2}" opacity="0.5"/>`;
  if (label) {
    if (opt.vertical) s += `<text x="${x + 10}" y="${y + 18}" fill="${t.muted}" font-size="10" font-family="${t.font}" style="text-transform:uppercase" letter-spacing="0.1em">${esc(label)}</text>`;
    else s += `<text x="${x + 10}" y="${y + 16}" fill="${t.muted}" font-size="10" font-family="${t.font}" style="text-transform:uppercase" letter-spacing="0.1em">${esc(label)}</text>`;
  }
  return s;
}
