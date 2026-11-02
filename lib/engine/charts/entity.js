// ===========================================================================
// entity.js — 编辑级"实体关系"图型引擎（ER / UML 类图 / 数据库模式）
// 设计铁律（继承 diagram-design）：无阴影、发丝线(1px)、4px 栅格、克制强调色、
// 正交折角连线、连线画在盒下、中文直接传 text、健壮不抛错。
// 依赖 shapes.js 的 expandTheme / textWidth / elbowPath / arrowDefs。
// ===========================================================================
import { svgOpen, svgClose, line, rect, path, esc } from '../base.js';
import { expandTheme, arrowDefs, textWidth, elbowPath } from '../diagrams/shapes.js';

const MONO = "ui-monospace, Menlo, Consolas, 'Courier New', monospace";

let _idc = 0;
const uid = () => (_idc++).toString(36);

// ---------------------------------------------------------------------------
// 文本原语：支持等宽观感(mono)、斜体、透明度；继承 svg 根 font-family。
// ---------------------------------------------------------------------------
function T(x, y, str, color, size, o = {}) {
  const { weight = 'normal', anchor = 'start', mono = false, italic = false, opacity = null } = o;
  const fa = mono ? ` font-family="${MONO}"` : '';
  const fi = italic ? ` font-style="italic"` : '';
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}" dominant-baseline="alphabetic"${fa}${fi}${op}>${esc(str)}</text>`;
}

// 带 paper 遮罩的小标签（基数 / 关系名 / FK 说明），避免线穿透文字。
function maskedText(t, x, y, str, o = {}) {
  const size = o.size || 8;
  const color = o.color || t.muted;
  const w = textWidth(str, size, !!o.mono) + 12;
  const h = size + 6;
  return rect(x - w / 2, y - h / 2, w, h, t, { fill: t.paper, rx: 2 }) +
    T(x, y + size / 3, str, color, size, { anchor: 'middle', mono: !!o.mono });
}

// 网格布局：把若干盒放进 sqrt 列数的网格，盒在各自单元格内水平居中。
function gridLayout(items, gap, sx, sy) {
  const n = items.length;
  const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / cols);
  items.forEach((it, i) => { it._c = i % cols; it._r = Math.floor(i / cols); });
  const colW = new Array(cols).fill(0), rowH = new Array(rows).fill(0);
  items.forEach((it) => { colW[it._c] = Math.max(colW[it._c], it.w); rowH[it._r] = Math.max(rowH[it._r], it.h); });
  const xs = [], ys = [];
  let cx = sx; for (let c = 0; c < cols; c++) { xs[c] = cx; cx += colW[c] + gap; }
  let cy = sy; for (let r = 0; r < rows; r++) { ys[r] = cy; cy += rowH[r] + gap; }
  items.forEach((it) => { it.x = xs[it._c] + (colW[it._c] - it.w) / 2; it.y = ys[it._r]; });
}

// 由两盒相对位置决定连线起止边与方向（正交折角用）。
function anchorPoints(A, B) {
  const acx = A.x + A.w / 2, acy = A.y + (A.cy != null ? A.cy : A.h / 2);
  const bcx = B.x + B.w / 2, bcy = B.y + (B.cy != null ? B.cy : B.h / 2);
  const dx = bcx - acx, dy = bcy - acy;
  let sx, sy, ex, ey, vertical;
  if (Math.abs(dx) >= Math.abs(dy)) {
    vertical = false;
    if (dx >= 0) { sx = A.x + A.w; sy = acy; ex = B.x; ey = bcy; }
    else { sx = A.x; sy = acy; ex = B.x + B.w; ey = bcy; }
  } else {
    vertical = true;
    if (dy >= 0) { sx = acx; sy = A.y + A.h; ex = bcx; ey = B.y; }
    else { sx = acx; sy = A.y; ex = bcx; ey = B.y + B.h; }
  }
  return { sx, sy, ex, ey, dx: Math.sign(dx), dy: Math.sign(dy), vertical };
}

function emptySvg(W, H, theme, opts, kind) {
  const t = expandTheme(theme || {});
  let s = svgOpen(W, H, theme || {});
  s += rect(0, 0, W, H, t, { fill: t.paper });
  if (opts && opts.showTitle !== false && opts.title) s += T(60, 40, opts.title, t.ink, 20, { weight: '700' });
  s += T(60, Math.round(H / 2), opts && opts.lang === 'en' ? `${kind} · No data` : `${kind} · 暂无数据 / No data`, t.muted, 12);
  return s + svgClose();
}
function safeSvg(opts, theme, kind) {
  return emptySvg((opts && opts.w) || 860, (opts && opts.h) || 520, theme, opts, kind);
}

// ===========================================================================
// 1) ER 数据模型
// DSL:
//   entity: 名称 | 字段1:类型, 字段2:类型, ...
//     字段前缀 * 标记主键(PK, 下划线), > 标记外键(FK, → 前缀)；二者均可省略。
//   rel: A 基数左--基数右 B [| 关系名]
//     基数示例: 1, N, 0..1, 1..*（crow's foot 简化：连线 + 端部基数标签）
// ===========================================================================
function parseErField(str) {
  let pk = false, fk = false;
  let s = String(str).trim();
  if (s.startsWith('*')) { pk = true; s = s.slice(1).trim(); }
  else if (s.startsWith('>')) { fk = true; s = s.slice(1).trim(); }
  const idx = s.indexOf(':');
  let name = s, type = '';
  if (idx >= 0) { name = s.slice(0, idx).trim(); type = s.slice(idx + 1).trim(); }
  return { name, type, pk, fk };
}
function parseErRel(body) {
  const m = body.match(/^(\S+)\s+(\S+)\s*--\s*(\S+)\s+(\S+)\s*(?:\|\s*(.*))?$/);
  if (!m) return null;
  return { a: m[1], cardA: m[2], cardB: m[3], b: m[4], label: (m[5] || '').trim() };
}
function drawErEntity(e, t) {
  const x = e.x, y = e.y, w = e.w, h = e.h;
  let s = '';
  s += rect(x, y, w, h, t, { fill: t.paper, stroke: t.ink, sw: 1, rx: 6 });
  s += rect(x, y, w, 40, t, { fill: t._rgba(t.ink, 0.05), rx: 6 });
  s += rect(x, y + 32, w, 8, t, { fill: t._rgba(t.ink, 0.05) });
  s += line(x, y + 40, x + w, y + 40, t, { color: t.ruleSolid, width: 1 });
  s += T(x + 12, y + 16, 'ENTITY', t.muted, 8, { mono: true, weight: '600' });
  s += T(x + 12, y + 31, e.name, t.ink, 14, { weight: '600' });
  const ROW = 22;
  e.fields.forEach((f, i) => {
    const fy = y + 40 + 14 + i * ROW;
    const left = (f.pk ? '# ' : f.fk ? '→ ' : '') + f.name;
    s += T(x + 12, fy, left, t.ink, 10, { mono: true });
    if (f.type) s += T(x + w - 12, fy, f.type, t.muted, 10, { mono: true, anchor: 'end' });
    if (f.pk) { const lw = textWidth(left, 10, true); s += line(x + 12, fy + 2, x + 12 + lw, fy + 2, t, { color: t.ink, width: 1 }); }
  });
  return s;
}
export function renderEr(data, theme, opts = {}) {
  try {
    const t = expandTheme(theme);
    const W0 = opts.w || 860, H0 = opts.h || 520;
    const showTitle = opts.showTitle !== false && !!opts.title;
    const topPad = showTitle ? 64 : 32;
    const lines = String(data || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const entities = [], rels = [];
    for (const ln of lines) {
      if (/^entity:/i.test(ln)) {
        const body = ln.replace(/^entity:/i, '').trim();
        const [namePart, fieldPart = ''] = body.split('|');
        const fields = fieldPart.split(',').map((f) => f.trim()).filter(Boolean).map(parseErField);
        entities.push({ name: namePart.trim(), fields });
      } else if (/^rel:/i.test(ln)) {
        const r = parseErRel(ln.replace(/^rel:/i, '').trim());
        if (r) rels.push(r);
      }
    }
    if (!entities.length) return emptySvg(W0, H0, theme, opts, 'ER');

    entities.forEach((e) => {
      const nameW = textWidth(e.name, 14);
      let lMax = 0, rMax = 0;
      e.fields.forEach((f) => {
        const left = (f.pk ? '# ' : f.fk ? '→ ' : '') + f.name;
        lMax = Math.max(lMax, textWidth(left, 10, true));
        rMax = Math.max(rMax, textWidth(f.type || '', 10, true));
      });
      e.w = Math.ceil(Math.max(nameW + 36, lMax + rMax + 28 + 44) / 4) * 4;
      const ROW = 22;
      e.h = Math.ceil((40 + (e.fields.length ? e.fields.length * ROW + 14 : 24)) / 4) * 4;
    });
    gridLayout(entities, 56, 60, topPad);

    let maxX = 0, maxY = 0;
    entities.forEach((e) => { maxX = Math.max(maxX, e.x + e.w); maxY = Math.max(maxY, e.y + e.h); });
    const W = Math.ceil(Math.max(W0, maxX + 40) / 4) * 4;
    const H = Math.ceil(Math.max(H0, maxY + 40) / 4) * 4;
    const byName = new Map(entities.map((e) => [e.name.toLowerCase(), e]));

    let s = svgOpen(W, H, theme);
    s += rect(0, 0, W, H, t, { fill: t.paper });
    if (showTitle) s += T(60, 40, opts.title, t.ink, 20, { weight: '700' });

    rels.forEach((r) => {
      const A = byName.get(r.a.toLowerCase()), B = byName.get(r.b.toLowerCase());
      if (!A || !B) return;
      const res = anchorPoints(A, B);
      const d = elbowPath(res.sx, res.sy, res.ex, res.ey, { vertical: res.vertical, r: 8 });
      s += path(d, { stroke: t.muted, sw: 1 });
      const lx = res.sx + (res.dx > 0 ? -16 : res.dx < 0 ? 16 : 0);
      const ly = res.sy + (res.dy > 0 ? -16 : res.dy < 0 ? 16 : 0);
      const rx = res.ex + (res.dx > 0 ? 16 : res.dx < 0 ? -16 : 0);
      const ry = res.ey + (res.dy > 0 ? 16 : res.dy < 0 ? -16 : 0);
      s += maskedText(t, lx, ly, r.cardA, { mono: true });
      s += maskedText(t, rx, ry, r.cardB, { mono: true });
      if (r.label) s += maskedText(t, (res.sx + res.ex) / 2, (res.sy + res.ey) / 2, r.label);
    });
    entities.forEach((e) => { s += drawErEntity(e, t); });
    return s + svgClose();
  } catch (err) {
    return safeSvg(opts, theme, 'ER');
  }
}

// ===========================================================================
// 2) UML 类图
// DSL:
//   class: 类名 | 成员1; 成员2; ...
//     成员: 可见性+名称:类型(属性) 或 可见性+名称(参数):返回(方法)
//     可见性: + 公开 / - 私有 / # 受保护
//     类名前缀 «interface» 表示接口(置顶 stereotype)；前缀 * 表示抽象类(斜体)
//   inherit: 子类 <|-- 父类   (空心三角箭头，画在父类端)
//   realize: 实现类 <|-- 接口  (同上，虚线)
// ===========================================================================
function drawUmlClass(c, t) {
  const x = c.x, y = c.y, w = c.w, h = c.h;
  let s = rect(x, y, w, h, t, { fill: t.paper, stroke: t.ink, sw: 1, rx: 6 });
  const nameH = c.eyebrow ? 44 : 32;
  if (c.eyebrow) s += T(x + w / 2, y + 14, '«' + c.eyebrow + '»', t.muted, 8, { anchor: 'middle', mono: true });
  s += T(x + w / 2, y + (c.eyebrow ? 32 : 20), c.name, t.ink, 12, { anchor: 'middle', weight: '600', italic: c.abstract });
  let cur = y + nameH;
  if (c.attrs.length) {
    s += line(x, cur, x + w, cur, t, { color: t.ruleSolid, width: 1 });
    c.attrs.forEach((m, i) => { s += T(x + 12, cur + 14 + i * 18, m, t.ink, 9, { mono: true }); });
    cur += c.attrs.length * 18 + 8;
  }
  if (c.ops.length) {
    s += line(x, cur, x + w, cur, t, { color: t.ruleSolid, width: 1 });
    c.ops.forEach((m, i) => { s += T(x + 12, cur + 14 + i * 18, m, t.ink, 9, { mono: true }); });
    cur += c.ops.length * 18 + 8;
  }
  return s;
}
export function renderUmlClass(data, theme, opts = {}) {
  try {
    const t = expandTheme(theme);
    const W0 = opts.w || 880, H0 = opts.h || 560;
    const showTitle = opts.showTitle !== false && !!opts.title;
    const topPad = showTitle ? 64 : 32;
    const lines = String(data || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const classes = [], edges = [];
    for (const ln of lines) {
      if (/^class:/i.test(ln)) {
        const body = ln.replace(/^class:/i, '').trim();
        const [namePart, memPart = ''] = body.split('|');
        let raw = namePart.trim();
        let eyebrow = '', abstract = false;
        const em = raw.match(/^«(.+?)»\s*(.*)$/);
        if (em) { eyebrow = em[1]; raw = em[2].trim(); }
        if (raw.startsWith('*')) { abstract = true; raw = raw.slice(1).trim(); }
        const members = memPart.split(';').map((m) => m.trim()).filter(Boolean);
        const attrs = [], ops = [];
        members.forEach((m) => { if (/\(/.test(m)) ops.push(m); else attrs.push(m); });
        classes.push({ name: raw, eyebrow, abstract, attrs, ops });
      } else if (/^inherit:/i.test(ln)) {
        const m = ln.replace(/^inherit:/i, '').trim().match(/^(\S+)\s*<\|--\s*(\S+)$/);
        if (m) edges.push({ child: m[1], parent: m[2], kind: 'inherit' });
      } else if (/^realize:/i.test(ln)) {
        const m = ln.replace(/^realize:/i, '').trim().match(/^(\S+)\s*<\|--\s*(\S+)$/);
        if (m) edges.push({ child: m[1], parent: m[2], kind: 'realize' });
      }
    }
    if (!classes.length) return emptySvg(W0, H0, theme, opts, 'UML');

    classes.forEach((c) => {
      const nameW = textWidth(c.name, 12);
      const ebW = c.eyebrow ? textWidth('«' + c.eyebrow + '»', 8, true) : 0;
      let mMax = 0;
      c.attrs.concat(c.ops).forEach((m) => { mMax = Math.max(mMax, textWidth(m, 9, true)); });
      c.w = Math.ceil(Math.max(nameW, ebW, mMax) + 28) / 4 * 4;
      const nameH = c.eyebrow ? 44 : 32;
      const attrH = c.attrs.length ? c.attrs.length * 18 + 8 : 0;
      const opH = c.ops.length ? c.ops.length * 18 + 8 : 0;
      c.h = Math.ceil((nameH + attrH + opH) / 4) * 4;
    });
    gridLayout(classes, 64, 60, topPad);

    let maxX = 0, maxY = 0;
    classes.forEach((c) => { maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); });
    const W = Math.ceil(Math.max(W0, maxX + 40) / 4) * 4;
    const H = Math.ceil(Math.max(H0, maxY + (edges.length ? 56 : 40)) / 4) * 4;
    const byName = new Map(classes.map((c) => [c.name.toLowerCase(), c]));
    const idp = 'cf' + uid();

    let s = svgOpen(W, H, theme);
    s += rect(0, 0, W, H, t, { fill: t.paper });
    if (showTitle) s += T(60, 40, opts.title, t.ink, 20, { weight: '700' });
    s += `<defs><marker id="${idp}-tri" markerWidth="16" markerHeight="12" refX="14" refY="6" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0 0,16 6,0 12" fill="${t.paper}" stroke="${t.ink}" stroke-width="1"/></marker></defs>`;

    edges.forEach((e) => {
      const C = byName.get(e.child.toLowerCase()), P = byName.get(e.parent.toLowerCase());
      if (!C || !P) return;
      const res = anchorPoints(C, P);
      const d = elbowPath(res.sx, res.sy, res.ex, res.ey, { vertical: res.vertical, r: 8 });
      const dash = e.kind === 'realize' ? '5,4' : '';
      s += `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="1"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#${idp}-tri)"/>`;
    });
    classes.forEach((c) => { s += drawUmlClass(c, t); });

    if (edges.length) {
      const ly = H - 26;
      s += `<line x1="60" y1="${ly}" x2="92" y2="${ly}" stroke="${t.ink}" stroke-width="1" marker-end="url(#${idp}-tri)"/>`;
      s += T(100, ly + 4, opts.lang === 'en' ? 'Inheritance / Realization' : '继承 / 实现 (Inheritance / Realization)', t.muted, 9);
    }
    return s + svgClose();
  } catch (err) {
    return safeSvg(opts, theme, 'UML');
  }
}

// ===========================================================================
// 3) 数据库模式
// DSL:
//   table: [schema.]表名 | 列1, 列2, ...
//     列: 列名:类型        例: id:int
//         列名:PK 类型      主键标记 PK
//         列名:UQ NN 类型   唯一/非空标记
//         列名:FK->目标表.目标列 类型   外键，连线指向目标列
//         列名:FK->目标表.目标列 CASCADE 类型  级联删除(强调色 + 目标表头淡色)
//   index: 表名 | 索引1, 索引2    (可选，索引分区)
//   fk: 表.列 -> 目标表.目标列    (可选显式外键写法)
// ===========================================================================
function parseDbCol(str) {
  const idx = str.indexOf(':');
  let name = str, rest = '';
  if (idx >= 0) { name = str.slice(0, idx).trim(); rest = str.slice(idx + 1).trim(); }
  const tokens = rest.split(/\s+/).filter(Boolean);
  const chips = []; let type = ''; let ref = null; let cascade = false;
  for (const tok of tokens) {
    if (/^PK$/i.test(tok)) chips.push('PK');
    else if (/^UQ$/i.test(tok)) chips.push('UQ');
    else if (/^NN$/i.test(tok)) chips.push('NN');
    else if (/^FK->/i.test(tok)) { chips.push('FK'); ref = tok.slice(4); }
    else if (/^CASCADE$/i.test(tok)) cascade = true;
    else type += (type ? ' ' : '') + tok;
  }
  if (ref && !chips.includes('FK')) chips.push('FK');
  return { name, type, chips, ref, cascade };
}
function drawDbTable(tb, t) {
  const x = tb.x, y = tb.y, w = tb.w, h = tb.h;
  let s = rect(x, y, w, h, t, { fill: t.paper, stroke: t.ink, sw: 1, rx: 6 });
  const headerFill = tb._cascade ? t.accentTint : t._rgba(t.ink, 0.05);
  s += rect(x, y, w, 28, t, { fill: headerFill, rx: 6 });
  s += rect(x, y + 20, w, 8, t, { fill: headerFill });
  s += line(x, y + 28, x + w, y + 28, t, { color: t.ruleSolid, width: 1 });
  s += T(x + 12, y + 18, tb.name, t.ink, 12, { weight: '600' });
  s += rect(x + w - 52, y + 8, 40, 12, t, { fill: 'none', stroke: t._rgba(t.ink, 0.4), sw: 0.8, rx: 2 });
  s += T(x + w - 32, y + 17, 'TABLE', t.ink, 8, { anchor: 'middle', mono: true, opacity: 0.8 });
  tb.cols.forEach((c, i) => {
    const ry = y + 28 + i * 24;
    if (i % 2 === 1) s += rect(x, ry, w, 24, t, { fill: t._rgba(t.ink, 0.02) });
    s += T(x + 12, ry + 16, c.name, t.ink, 12);
    let cx = x + 12 + textWidth(c.name, 12) + 12;
    c.chips.forEach((ch) => {
      s += rect(cx, ry + 6, 20, 12, t, { fill: 'none', stroke: t._rgba(t.ink, 0.35), sw: 0.8, rx: 2 });
      s += T(cx + 10, ry + 15, ch, t.ink, 8, { anchor: 'middle', mono: true, opacity: 0.75 });
      cx += 24;
    });
    if (c.type) s += T(x + w - 12, ry + 16, c.type, t.muted, 9, { anchor: 'end', mono: true });
  });
  if (tb._idx && tb._idx.length) {
    const iy = y + 28 + tb.cols.length * 24;
    s += line(x, iy, x + w, iy, t, { color: t._rgba(t.ink, 0.12), width: 0.8 });
    s += T(x + 12, iy + 12, 'INDEXES', t.muted, 8, { mono: true });
    tb._idx.forEach((ix, i) => { s += T(x + 12, iy + 28 + i * 14, ix, t.muted, 9, { mono: true }); });
  }
  return s;
}
export function renderDbSchema(data, theme, opts = {}) {
  try {
    const t = expandTheme(theme);
    const W0 = opts.w || 960, H0 = opts.h || 560;
    const showTitle = opts.showTitle !== false && !!opts.title;
    const topPad = showTitle ? 64 : 32;
    const lines = String(data || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const tables = [], fks = [], indexes = {};
    for (const ln of lines) {
      if (/^table:/i.test(ln)) {
        const body = ln.replace(/^table:/i, '').trim();
        const [namePart, colPart = ''] = body.split('|');
        const name = namePart.trim();
        const cols = colPart.split(',').map((c) => c.trim()).filter(Boolean).map(parseDbCol);
        tables.push({ name, simple: name.split('.').pop(), cols });
      } else if (/^index:/i.test(ln)) {
        const body = ln.replace(/^index:/i, '').trim();
        const [namePart, idxPart = ''] = body.split('|');
        indexes[namePart.trim().toLowerCase()] = idxPart.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (/^fk:/i.test(ln)) {
        const m = ln.replace(/^fk:/i, '').trim().match(/^(\S+)\.(\S+)\s*->\s*(\S+)\.(\S+)$/);
        if (m) fks.push({ fromT: m[1], fromC: m[2], toT: m[3], toC: m[4], cascade: false });
      }
    }
    if (!tables.length) return emptySvg(W0, H0, theme, opts, 'DB');

    tables.forEach((tb) => {
      tb.cols.forEach((col) => {
        if (col.ref) {
          const [rt, rc] = col.ref.split('.');
          fks.push({ fromT: tb.name, fromC: col.name, toT: rt, toC: rc || 'id', cascade: !!col.cascade });
        }
      });
    });

    tables.forEach((tb) => {
      let nameW = textWidth(tb.name, 12), typeW = 0, colNameW = 0, maxChips = 0;
      tb.cols.forEach((c) => {
        colNameW = Math.max(colNameW, textWidth(c.name, 12));
        typeW = Math.max(typeW, textWidth(c.type || '', 9));
        maxChips = Math.max(maxChips, c.chips.length);
      });
      const headerW = nameW + 60;
      const bodyInner = colNameW + 16 + maxChips * 24 + 16 + typeW + 24;
      tb.w = Math.ceil(Math.max(headerW, bodyInner) / 4) * 4;
      const idx = indexes[tb.name.toLowerCase()] || [];
      const idxH = idx.length ? 8 + 12 + idx.length * 14 : 0;
      tb.h = Math.ceil((28 + tb.cols.length * 24 + idxH) / 4) * 4;
      tb._idx = idx;
    });
    gridLayout(tables, 60, 60, topPad);

    const byName = new Map();
    tables.forEach((tb) => { byName.set(tb.name.toLowerCase(), tb); byName.set(tb.simple.toLowerCase(), tb); });
    const colCenter = (tb, colName) => {
      const i = tb.cols.findIndex((c) => c.name.toLowerCase() === String(colName).toLowerCase());
      return i < 0 ? null : tb.y + 28 + i * 24 + 12;
    };

    let maxX = 0, maxY = 0;
    tables.forEach((tb) => { maxX = Math.max(maxX, tb.x + tb.w); maxY = Math.max(maxY, tb.y + tb.h); });
    const W = Math.ceil(Math.max(W0, maxX + 40) / 4) * 4;
    const H = Math.ceil(Math.max(H0, maxY + 40) / 4) * 4;
    const idp = 'cf' + uid();

    let s = svgOpen(W, H, theme);
    s += rect(0, 0, W, H, t, { fill: t.paper });
    if (showTitle) s += T(60, 40, opts.title, t.ink, 20, { weight: '700' });
    s += arrowDefs(idp, t);

    fks.forEach((fk) => {
      const FT = byName.get(fk.fromT.toLowerCase()), TT = byName.get(fk.toT.toLowerCase());
      if (!FT || !TT) return;
      const syc = colCenter(FT, fk.fromC), tyc = colCenter(TT, fk.toC);
      if (syc == null || tyc == null) return;
      const rightOf = (TT.x + TT.w / 2) >= (FT.x + FT.w / 2);
      const sx = rightOf ? FT.x + FT.w : FT.x;
      const ex = rightOf ? TT.x : TT.x + TT.w;
      const d = elbowPath(sx, syc, ex, tyc, { r: 8 });
      const markerId = fk.cascade ? `${idp}-arrow-accent` : `${idp}-arrow`;
      const col = fk.cascade ? t.accent : t.muted;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${fk.cascade ? 1.2 : 1}" marker-end="url(#${markerId})"/>`;
      s += maskedText(t, (sx + ex) / 2, (syc + tyc) / 2, fk.cascade ? 'ON DELETE CASCADE' : 'FK', { color: col, size: 8, mono: true });
      if (fk.cascade) TT._cascade = true;
    });
    tables.forEach((tb) => { s += drawDbTable(tb, t); });
    return s + svgClose();
  } catch (err) {
    return safeSvg(opts, theme, 'DB');
  }
}
