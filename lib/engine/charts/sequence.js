// ===========================================================================
// sequence.js — 时序图（Sequence Diagram）编辑级渲染器。
//   视觉对齐 diagram-design 的 Sequence 规范：
//     · 顶部每个 actor 一列（圆角盒 + 名称），下方浅色虚线生命线(lifeline)
//     · 消息按出现顺序自上而下，在生命线间用带箭头连线传递
//     · 箭头上方标消息文本（不透明 paper 遮罩，避免线穿透标签）
//     · 发丝线(1px) · 无阴影 · 4px 栅格 · 克制强调色
//   设计铁律：箭头永远向下流动（y 随消息序号递增），绝不向上（逆转时间）。
// DSL（行注释支持 # 或 //）：
//   actor: 名称           定义参与者（顺序即列顺序）
//   actor: 名称 | 角色    角色∈focal/backend/store/external/input/optional（画小类型标签）
//   msg: A -> B | 文本    同步消息（实心箭头，实线）
//   msg: A ->> B | 文本   异步消息（开口箭头，虚线）
//   msg: A -> A | 文本    自消息（右侧 U 形回环）
// 完全自绘，不依赖 diagram-design 的 HTML。
// ===========================================================================
import { svgOpen, svgClose, text, esc } from '../base.js';
import {
  expandTheme, arrowDefs, nodeBox, textWidth,
} from '../diagrams/shapes.js';

let _id = 0;
const uid = () => `seq${(++_id).toString(36)}`;

const idxOf = (actors, name) => {
  for (let i = 0; i < actors.length; i++) if (actors[i].name === name) return i;
  return -1;
};

/** 解析时序 DSL → { actors:[{name,role}], msgs:[{from,to,label,async}] }。健壮不抛错。 */
function parseSequence(data) {
  const actors = [];
  const msgs = [];
  const lines = String(data == null ? '' : data).split(/\r?\n/);
  for (const raw of lines) {
    const ln = raw.trim();
    if (!ln || ln.startsWith('#') || ln.startsWith('//')) continue;
    if (ln.startsWith('actor:')) {
      const rest = ln.slice(6).trim();
      if (!rest) continue;
      let name = rest, role = '';
      const b = rest.indexOf('|');
      if (b >= 0) { name = rest.slice(0, b).trim(); role = rest.slice(b + 1).trim(); }
      if (name) actors.push({ name, role });
    } else if (ln.startsWith('msg:')) {
      const rest = ln.slice(4).trim();
      if (!rest) continue;
      let head = rest, label = '';
      const b = rest.indexOf('|');
      if (b >= 0) { head = rest.slice(0, b).trim(); label = rest.slice(b + 1).trim(); }
      let async = false, arrow = null;
      if (head.includes('->>')) { async = true; arrow = '->>'; }
      else if (head.includes('->')) { async = false; arrow = '->'; }
      if (!arrow) continue; // 非法箭头格式，跳过不破坏渲染
      const parts = head.split(arrow).map((s) => s.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1]) continue;
      msgs.push({ from: parts[0], to: parts[1], label, async });
    }
  }
  // 任何被消息引用但未声明的参与者，自动补为中性参与者（保证生命线不缺失）
  for (const m of msgs) {
    for (const who of [m.from, m.to]) {
      if (idxOf(actors, who) < 0) actors.push({ name: who, role: '' });
    }
  }
  return { actors, msgs };
}

export function renderSequence(data, theme, opts = {}) {
  const th = theme || {};
  const t = expandTheme(th);
  const { actors, msgs } = parseSequence(data);
  const W = opts.w || 860;
  const showTitle = opts.showTitle !== false;
  const lang = opts.lang === 'en' ? 'en' : 'zh';
  const idp = uid();

  // ---- 布局（尽量落在 4px 栅格）----
  const titleH = showTitle ? 64 : 28;
  const boxH = 52;
  const actorTop = titleH + 16;
  const lifelineTop = actorTop + boxH;
  const rowGap = 48;
  const firstMsgY = lifelineTop + 40;
  const lastMsgY = msgs.length ? firstMsgY + (msgs.length - 1) * rowGap : firstMsgY;
  const lifelineBottom = lastMsgY + 36;
  const legendTop = lifelineBottom + 20;
  const contentH = legendTop + 44;
  const H = opts.h ? Math.max(opts.h, Math.ceil(contentH / 4) * 4) : Math.ceil(contentH / 4) * 4;

  const leftPad = 84, rightPad = 84;
  const usableW = Math.max(1, W - leftPad - rightPad);
  const n = actors.length;
  const centers = actors.map((_, i) => {
    const x = n === 1 ? W / 2 : leftPad + (usableW * i) / (n - 1);
    return Math.round(x / 4) * 4;
  });
  const maxBoxW = n > 0 ? Math.max(80, Math.floor((usableW / n) - 16)) : 120;

  // ---- defs：复用 arrowDefs（实心箭头），并补一个开口箭头（异步专用）----
  let defs = arrowDefs(idp, t).replace('</defs>', '');
  defs += `<marker id="${idp}-arrow-open" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polyline points="0 0,8 3,0 6" fill="none" stroke="${t.muted}" stroke-width="1.2"/></marker></defs>`;

  // ---- 标题块 ----
  let s = svgOpen(W, H, th);
  if (showTitle) {
    s += text(80, 30, lang === 'en' ? 'SEQUENCE' : '时序图', t, { size: 10, color: t.muted, weight: '500' });
    s += text(80, 52, esc(opts.title || (lang === 'en' ? 'Sequence Diagram' : '时序图')), t, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(80, 70, esc(opts.subtitle), t, { size: 12, color: t.muted });
  }
  s += defs;

  if (n === 0) {
    s += text(Math.round(W / 2), Math.round(H / 2), lang === 'en' ? 'No participants' : '无参与者', t, { size: 13, color: t.muted, anchor: 'middle' });
    s += svgClose();
    return s;
  }

  // ---- 生命线（浅色虚线，置于最底层）----
  for (let i = 0; i < n; i++) {
    const cx = centers[i];
    s += `<line x1="${cx}" y1="${lifelineTop}" x2="${cx}" y2="${lifelineBottom}" stroke="${t._rgba(t.ink, 0.22)}" stroke-width="1" stroke-dasharray="3,3"/>`;
  }

  // ---- 消息箭头（线在盒下、标签在线上方遮罩）----
  msgs.forEach((m, i) => {
    const yi = firstMsgY + i * rowGap;
    const fi = idxOf(actors, m.from);
    const ti = idxOf(actors, m.to);
    const cx1 = centers[fi], cx2 = centers[ti];
    if (cx1 == null || cx2 == null) return; // 防御
    const stroke = m.async ? t.muted : t.link;
    const dash = m.async ? ' stroke-dasharray="5,4"' : '';
    const mk = m.async ? `${idp}-arrow-open` : `${idp}-arrow-link`;

    if (fi === ti) {
      // 自消息：右侧 U 形回环
      const loopW = 26, loopH = 20;
      const d = `M${cx1},${yi} L${cx1 + loopW},${yi} L${cx1 + loopW},${yi + loopH} L${cx1},${yi + loopH}`;
      s += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1"${dash} marker-end="url(#${mk})"/>`;
      if (m.label) {
        const tw = textWidth(m.label, 9) + 12;
        s += `<rect x="${cx1 + loopW + 6}" y="${yi + loopH - 18}" width="${tw}" height="14" rx="2" fill="${t.paper}"/>`;
        s += text(cx1 + loopW + 6 + tw / 2, yi + loopH - 7, m.label, t, { size: 9, color: t.soft, anchor: 'middle' });
      }
    } else {
      s += `<line x1="${cx1}" y1="${yi}" x2="${cx2}" y2="${yi}" stroke="${stroke}" stroke-width="1"${dash} marker-end="url(#${mk})"/>`;
      if (m.label) {
        const midX = (cx1 + cx2) / 2;
        const tw = textWidth(m.label, 9) + 14;
        const rx = Math.round((midX - tw / 2) / 4) * 4;
        s += `<rect x="${rx}" y="${yi - 19}" width="${tw}" height="14" rx="2" fill="${t.paper}"/>`;
        s += text(midX, yi - 8, m.label, t, { size: 9, color: t.soft, anchor: 'middle' });
      }
    }
  });

  // ---- 参与者盒（最后绘制，盖住顶部生命线起点）----
  actors.forEach((a, i) => {
    const cx = centers[i];
    const bw = Math.min(maxBoxW, Math.max(72, Math.round((textWidth(a.name, 12) + 32) / 4) * 4));
    const bx = Math.round((cx - bw / 2) / 4) * 4;
    const box = nodeBox(bx, actorTop, { label: a.name, role: a.role, shape: 'box', w: bw, h: boxH, theme: t });
    s += box.svg;
  });

  // ---- 图例（底部细线 + 两种箭头说明）----
  s += `<line x1="84" y1="${legendTop}" x2="${W - 84}" y2="${legendTop}" stroke="${t._rgba(t.ink, 0.10)}" stroke-width="0.8"/>`;
  s += text(84, legendTop + 16, lang === 'en' ? 'LEGEND' : '图例', t, { size: 8, color: t.muted, weight: '500' });
  const sy = legendTop + 26;
  s += `<line x1="84" y1="${sy}" x2="112" y2="${sy}" stroke="${t.link}" stroke-width="1" marker-end="url(#${idp}-arrow-link)"/>`;
  s += text(120, sy + 4, lang === 'en' ? 'Sync message' : '同步消息', t, { size: 9, color: t.soft });
  const ax = 220;
  s += `<line x1="${ax}" y1="${sy}" x2="${ax + 28}" y2="${sy}" stroke="${t.muted}" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#${idp}-arrow-open)"/>`;
  s += text(ax + 36, sy + 4, lang === 'en' ? 'Async message' : '异步消息', t, { size: 9, color: t.soft });

  s += svgClose();
  return s;
}
