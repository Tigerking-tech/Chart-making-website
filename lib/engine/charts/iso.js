// ===========================================================================
// iso.js — 编辑级轴测图型（ChartForge / diagram-design 风格）
//   · 爆炸轴测图 Exploded：逐层列表 → 2.5D 圆角板沿竖直轴错开叠加
//   · 轴测平面图 Axonometric plan：房间网格 → 2:1 等距地面砖
// 设计铁律：无阴影 · 发丝线 · 4px 栅格感 · accent 克制(≤1 焦点) · CJK 安全
// 投影纯数学（2:1 dimetric），所有坐标有限，不抛错、无 NaN。
// ===========================================================================
import { svgOpen, svgClose, text, line, circle, rect } from '../base.js';
import { expandTheme } from '../diagrams/shapes.js';

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

/** 颜色混合：base 上叠加 overlay，权重 a∈[0,1]。返回 rgb()，避免半透明叠出 NaN。 */
function mix(base, overlay, a) {
  const hex = (h) => {
    h = String(h).replace('#', '');
    if (h.length === 3) return h.split('').map((x) => parseInt(x + x, 16));
    return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
  };
  const A = hex(base), B = hex(overlay);
  const a2 = Math.max(0, Math.min(1, a));
  const r = Math.round(A[0] + (B[0] - A[0]) * a2);
  const g = Math.round(A[1] + (B[1] - A[1]) * a2);
  const b = Math.round(A[2] + (B[2] - A[2]) * a2);
  return `rgb(${r},${g},${b})`;
}

/** 2:1 dimetric 投影：模型点 → 相对屏幕点（z 向上）。纯数学，无除零/开方。 */
function iso(x, y, z) {
  return [x - y, (x + y) / 2 - z];
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const norm = (v) => {
  const L = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / L, v[1] / L];
};

/** 圆角四边形 path（屏幕坐标，顺时针 4 点），r 为圆角半径，自动钳制不越界。 */
function roundQuadPath(pts, r) {
  const n = pts.length;
  let edge = Infinity;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    edge = Math.min(edge, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  const rr = Math.max(0, Math.min(r, edge / 3));
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const v1 = norm(sub(p, prev));
    const v2 = norm(sub(p, next));
    const a = [prev[0] + v1[0] * rr, prev[1] + v1[1] * rr];
    const b = [next[0] + v2[0] * rr, next[1] + v2[1] * rr];
    if (i === 0) d += `M ${a[0].toFixed(2)} ${a[1].toFixed(2)} `;
    else d += `L ${a[0].toFixed(2)} ${a[1].toFixed(2)} `;
    d += `Q ${p[0].toFixed(2)} ${p[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)} `;
  }
  return d + 'Z';
}

/** 画一块挤出的板（顶面 + 两个可见侧面）。pts 为顶面四角屏幕坐标(顺序 A,B,C,D 顺时针)，
 *  base 为前下角的底部屏幕坐标，fills/stroke 决定明暗。返回 SVG 片段。 */
function slab(A, B, C, D, baseFront, fills, stroke) {
  const [bfx, bfy] = baseFront;
  const f = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  // 侧面：A 左后 / D 左前 / C 右前  → 面向屏幕右的侧面(D-C) 与 面向屏幕左的侧面(B-C)
  const rightFace = `${f(D)} ${f(C)} ${bfx.toFixed(2)},${bfy.toFixed(2)} ${D[0].toFixed(2)},${(bfy).toFixed(2)}`;
  // 更稳妥：直接用 D,C 与底部对应点
  const Db = [D[0], bfy], Cb = [C[0], bfy], Bb = [B[0], bfy];
  let s = '';
  // 屏幕右侧面 (y=const 边 D→C)
  s += `<polygon points="${f(D)} ${f(C)} ${f(Cb)} ${f(Db)}" fill="${fills.right}" stroke="none"/>`;
  // 屏幕左侧面 (x=const 边 B→C)
  s += `<polygon points="${f(B)} ${f(C)} ${f(Cb)} ${f(Bb)}" fill="${fills.left}" stroke="none"/>`;
  // 顶面
  s += `<path d="${roundQuadPath([A, B, C, D], 12)}" fill="${fills.top}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`;
  return s;
}

// ---------------------------------------------------------------------------
// 解析
// ---------------------------------------------------------------------------

/** 爆炸图层解析：每行一层，支持 `名称 | 副标 | 焦点(星号/focal/焦点)`，`#` 注释。 */
function parseLayers(data) {
  const out = [];
  String(data || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('|').map((s) => s.trim());
    const name = parts[0];
    if (!name) return;
    const sub = parts[1] || '';
    const focal = /^(focal|\*|焦点|重点)$/i.test(parts[2] || '');
    out.push({ name, sub, focal });
  });
  return out;
}

/** 轴测平面解析：CSV 首行表头可选，列 `名称,x,y,w,h[,副标[,焦点]]`。 */
function parseRooms(data) {
  const out = [];
  let first = true;
  String(data || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split(',').map((s) => s.trim());
    const x = Number(parts[1]);
    if (first) {
      first = false;
      if (/^(房间|name|room|区域|区|名称)$/i.test(parts[0]) || !isFinite(x)) return;
    }
    const name = parts[0] || 'Room';
    const rx = isFinite(x) ? x : 0;
    const ry = isFinite(Number(parts[2])) ? Number(parts[2]) : 0;
    const rw = isFinite(Number(parts[3])) ? Math.max(1, Number(parts[3])) : 1;
    const rh = isFinite(Number(parts[4])) ? Math.max(1, Number(parts[4])) : 1;
    const sub = parts[5] || '';
    const focal = /^(focal|\*|焦点|重点)$/i.test(parts[6] || '');
    out.push({ name, x: rx, y: ry, w: rw, h: rh, sub, focal });
  });
  return out;
}

// ---------------------------------------------------------------------------
// 渲染：爆炸轴测图
// ---------------------------------------------------------------------------
export function renderExploded(data, theme, opts = {}) {
  try {
    const t = expandTheme(theme);
    const W = Math.max(320, opts.w || 860);
    const H = Math.max(240, opts.h || 520);
    let s = svgOpen(W, H, theme);
    s += `<rect width="100%" height="100%" fill="${t.grid}"/>`;
    const hasTitle = opts.showTitle !== false && !!opts.title;
    if (hasTitle) {
      s += text(28, 36, opts.title, theme, { size: 20, weight: '700', color: t.ink });
      if (opts.subtitle) s += text(28, 56, opts.subtitle, theme, { size: 12, color: t.muted });
    }

    const layers = parseLayers(data);
    if (!layers.length) { s += svgClose(); return s; }
    const n = layers.length;
    const BW = 200, BD = 200, TH = 12, gap = 60; // 模型单位
    const step = TH + gap;

    // 相对坐标 + 包围盒
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const rel = [];
    for (let i = 0; i < n; i++) {
      const zT = i * step + TH, zB = i * step;
      const A = iso(0, 0, zT), B = iso(BW, 0, zT), C = iso(BW, BD, zT), D = iso(0, BD, zT);
      const Cb = iso(BW, BD, zB);
      [A, B, C, D, Cb].forEach((p) => {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      });
      rel.push({ A, B, C, D, Cb, zT, zB });
    }

    const left = 96, right = W - 40, top = hasTitle ? 76 : 40, bottom = H - 40;
    const availW = Math.max(40, right - left), availH = Math.max(40, bottom - top);
    const ow = (maxX - minX) || 1, oh = (maxY - minY) || 1;
    const sc = Math.max(0.05, Math.min(availW / ow, availH / oh));
    const sxMin = minX * sc, sxMax = maxX * sc, syMin = minY * sc, syMax = maxY * sc;
    const ox = left + (availW - (sxMax - sxMin)) / 2 - sxMin;
    const oy = top + (availH - (syMax - syMin)) / 2 - syMin;
    const P = (p) => [ox + p[0] * sc, oy + p[1] * sc];

    // 自底向上画板
    for (let i = 0; i < n; i++) {
      const L = layers[i]; const r = rel[i]; const foc = L.focal;
      const A = P(r.A), B = P(r.B), C = P(r.C), D = P(r.D);
      const Cb = P(r.Cb), Bb = P([BW, 0, r.zB]), Db = P([0, BD, r.zB]);
      const fills = foc
        ? { top: mix(t.paper, t.accent, 0.10), left: mix(t.paper, t.accent, 0.18), right: mix(t.paper, t.accent, 0.30) }
        : { top: t.paper, left: mix(t.paper, t.ink, 0.06), right: mix(t.paper, t.ink, 0.13) };
      const stroke = foc ? t.accent : t.ink;
      s += slab(A, B, C, D, Cb, fills, stroke);
    }

    // 序号虚线脊柱 + 序号徽标 + 层名（画在最上层）
    if (n > 1) {
      const a0 = P(rel[0].A), a1 = P(rel[n - 1].A);
      s += line(a0[0] - 18, a0[1], a1[0] - 18, a1[1], theme, { color: t.muted, width: 0.8, dash: '4,3', opacity: 0.55 });
    }
    for (let i = 0; i < n; i++) {
      const L = layers[i]; const r = rel[i]; const foc = L.focal;
      const Ac = P(r.A); // 顶层后角（板最高点）
      const bx = Ac[0] - 18, by = Ac[1];
      const nameColor = foc ? t.accent : t.ink;
      s += text(bx + 22, by - 9, L.name, theme, { size: 15, weight: '600', color: nameColor });
      if (L.sub) s += text(bx + 22, by + 7, L.sub, theme, { size: 10, color: foc ? t.accent : t.muted });
      s += circle(bx, by, 11, foc ? t.accent : t.paper, { stroke: foc ? t.accent : t.ink, sw: 1.2 });
      s += text(bx, by + 4, String(i + 1), theme, { size: 12, weight: '700', color: foc ? t.paper : t.ink, anchor: 'middle' });
    }

    s += svgClose();
    return s;
  } catch (e) {
    return svgOpen(opts && opts.w || 860, opts && opts.h || 520, theme) + svgClose();
  }
}

// ---------------------------------------------------------------------------
// 渲染：轴测平面图
// ---------------------------------------------------------------------------
export function renderAxonometricPlan(data, theme, opts = {}) {
  try {
    const t = expandTheme(theme);
    const W = Math.max(320, opts.w || 860);
    const H = Math.max(240, opts.h || 520);
    let s = svgOpen(W, H, theme);
    s += `<rect width="100%" height="100%" fill="${t.grid}"/>`;
    const hasTitle = opts.showTitle !== false && !!opts.title;
    if (hasTitle) {
      s += text(28, 36, opts.title, theme, { size: 20, weight: '700', color: t.ink });
      if (opts.subtitle) s += text(28, 56, opts.subtitle, theme, { size: 12, color: t.muted });
    }

    const rooms = parseRooms(data);
    if (!rooms.length) { s += svgClose(); return s; }
    let gw = 0, gh = 0;
    rooms.forEach((r) => { gw = Math.max(gw, r.x + r.w); gh = Math.max(gh, r.y + r.h); });
    const TH = 6; // 底板厚度
    const tileZ = TH; // 地面（顶面）高度

    // 相对坐标 + 包围盒（顶面四角 + 前下角）
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const corners = [[0, 0], [gw, 0], [gw, gh], [0, gh]];
    corners.forEach((p) => {
      const q = iso(p[0], p[1], tileZ);
      minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]);
      minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
    });
    const bf = iso(gw, gh, 0);
    maxY = Math.max(maxY, bf[1]);

    const left = 60, right = W - 40, top = hasTitle ? 76 : 40, bottom = H - 40;
    const availW = Math.max(40, right - left), availH = Math.max(40, bottom - top);
    const ow = (maxX - minX) || 1, oh = (maxY - minY) || 1;
    const sc = Math.max(0.05, Math.min(availW / ow, availH / oh));
    const sxMin = minX * sc, sxMax = maxX * sc, syMin = minY * sc, syMax = maxY * sc;
    const ox = left + (availW - (sxMax - sxMin)) / 2 - sxMin;
    const oy = top + (availH - (syMax - syMin)) / 2 - syMin;
    const P = (p) => [ox + p[0] * sc, oy + p[1] * sc];

    // 底板（地面）挤出
    const T0 = P(iso(0, 0, tileZ)), T1 = P(iso(gw, 0, tileZ)), T2 = P(iso(gw, gh, tileZ)), T3 = P(iso(0, gh, tileZ));
    const B1 = P(iso(gw, 0, 0)), B2 = P(iso(gw, gh, 0)), B3 = P(iso(0, gh, 0));
    const plateFills = { top: t.paper, left: mix(t.paper, t.ink, 0.06), right: mix(t.paper, t.ink, 0.13) };
    // 侧面 + 顶面（用 slab：A=T0,B=T1,C=T2,D=T3, 前下角=C 底部 B2）
    // 这里底座前下角是 T2 的底部 B2
    s += `<polygon points="${T3[0].toFixed(2)},${T3[1].toFixed(2)} ${T2[0].toFixed(2)},${T2[1].toFixed(2)} ${B2[0].toFixed(2)},${B2[1].toFixed(2)} ${B3[0].toFixed(2)},${B3[1].toFixed(2)}" fill="${plateFills.right}" stroke="none"/>`;
    s += `<polygon points="${T1[0].toFixed(2)},${T1[1].toFixed(2)} ${T2[0].toFixed(2)},${T2[1].toFixed(2)} ${B2[0].toFixed(2)},${B2[1].toFixed(2)} ${B1[0].toFixed(2)},${B1[1].toFixed(2)}" fill="${plateFills.left}" stroke="none"/>`;
    s += `<polygon points="${T0[0].toFixed(2)},${T0[1].toFixed(2)} ${T1[0].toFixed(2)},${T1[1].toFixed(2)} ${T2[0].toFixed(2)},${T2[1].toFixed(2)} ${T3[0].toFixed(2)},${T3[1].toFixed(2)}" fill="${plateFills.top}" stroke="${t.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;

    // 地面网格（单位线，克制）
    if (gw * gh <= 200) {
      for (let xi = 1; xi < gw; xi++) {
        const a = P(iso(xi, 0, tileZ)), b = P(iso(xi, gh, tileZ));
        s += line(a[0], a[1], b[0], b[1], theme, { color: t.rule, width: 0.5 });
      }
      for (let yi = 1; yi < gh; yi++) {
        const a = P(iso(0, yi, tileZ)), b = P(iso(gw, yi, tileZ));
        s += line(a[0], a[1], b[0], b[1], theme, { color: t.rule, width: 0.5 });
      }
    }

    // 房间地块（平行四边形）
    rooms.forEach((r) => {
      const R0 = P(iso(r.x, r.y, tileZ)), R1 = P(iso(r.x + r.w, r.y, tileZ));
      const R2 = P(iso(r.x + r.w, r.y + r.h, tileZ)), R3 = P(iso(r.x, r.y + r.h, tileZ));
      const fill = r.focal ? mix(t.paper, t.accent, 0.16) : t.paper2;
      const stroke = r.focal ? t.accent : t.ink;
      s += `<polygon points="${R0[0].toFixed(2)},${R0[1].toFixed(2)} ${R1[0].toFixed(2)},${R1[1].toFixed(2)} ${R2[0].toFixed(2)},${R2[1].toFixed(2)} ${R3[0].toFixed(2)},${R3[1].toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`;
    });

    // 房间名（水平，置于地块中心；焦点用 accent）
    rooms.forEach((r) => {
      const c = P(iso(r.x + r.w / 2, r.y + r.h / 2, tileZ));
      const col = r.focal ? t.accent : t.ink;
      s += text(c[0], c[1] - (r.sub ? 3 : 4), r.name, theme, { size: 13, weight: '600', color: col, anchor: 'middle' });
      if (r.sub) s += text(c[0], c[1] + 10, r.sub, theme, { size: 9, color: r.focal ? t.accent : t.muted, anchor: 'middle' });
    });

    s += svgClose();
    return s;
  } catch (e) {
    return svgOpen(opts && opts.w || 860, opts && opts.h || 520, theme) + svgClose();
  }
}
