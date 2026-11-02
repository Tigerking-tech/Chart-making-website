// ===========================================================================
// comparison.js — 编辑级比较图型渲染器（对齐 diagram-design）
//   象限图 Quadrant · 雷达图 Radar · 极坐标图 Polar · 韦恩图 Venn · 金字塔/漏斗 Pyramid
// 设计铁律：无阴影 · 发丝线(stroke 1) · 4px 栅格 · 克制强调色(accent 仅 1–2 焦点)
// 所有函数返回自包含 SVG 字符串（svgOpen … svgClose），异常/空输入也返回合法 SVG。
// ===========================================================================
import {
  svgOpen, svgClose, text, line, rect, circle, path, niceScale, scale, esc,
} from '../base.js';
import { expandTheme } from '../diagrams/shapes.js';

// ---------------------------------------------------------------------------
// 公共工具
// ---------------------------------------------------------------------------

/** 解析 CSV（支持中英文逗号/制表符分隔）。返回二维字符串数组，已 trim。 */
function parseCSV(data) {
  const lines = String(data || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
  return lines.map((l) => l.split(/[,，\t]/).map((c) => c.trim()));
}

/** 若首行含非数字的数据列，则视为表头，返回数据行。 */
function stripHeader(rows) {
  if (rows.length < 2) return rows;
  const r0 = rows[0];
  const r1 = rows[1];
  const isNum = (s) => s !== '' && isFinite(parseFloat(s));
  // 表头特征：第 2 列不是数字（如 "x" / "值"）
  if (!isNum(r0[1]) || (r1[1] !== undefined && !isNum(r0[1]) && !isNum(r1[1]))) {
    // 仅当首行第 2 列非数字时剥离
  }
  if (!isNum(r0[1])) return rows.slice(1);
  return rows;
}

function titleBlock(opts, t) {
  let s = '';
  const showTitle = opts.showTitle !== false;
  if (showTitle) {
    s += text(64, 40, opts.title || '', t, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(64, 58, opts.subtitle, t, { size: 12, color: t.muted });
  }
  return { s, top: showTitle ? 80 : 24 };
}

/** 空/异常数据时的兜底 SVG。 */
const EMPTY_MSG_EN = {
  '（暂无数据）': '(No data yet)',
  '（请输入“名称,x,y”格式的数据）': '(Enter data as "name,x,y")',
  '（雷达图需要表头 + 至少 3 行轴数据）': '(Radar needs a header + ≥3 axis rows)',
  '（请至少给出 1 个系列列）': '(Provide at least one series column)',
  '（雷达图需要 3–5 个轴）': '(Radar needs 3–5 axes)',
  '（极坐标图需要 4–8 个“类别,值”数据）': '(Polar needs 4–8 "category,value" rows)',
  '（韦恩图需要至少 2 个集合，如 A: 客户）': '(Venn needs ≥2 sets, e.g. A: Customers)',
  '（金字塔需要至少 2 行“层级,值”数据）': '(Pyramid needs ≥2 "tier,value" rows)',
};
function emptyChart(opts, t, msg) {
  const W = opts.w || 860;
  const H = opts.h || 520;
  const { s: titleS } = titleBlock(opts, t);
  let s = svgOpen(W, H, t);
  s += titleS;
  const shown = opts.lang === 'en' ? (EMPTY_MSG_EN[msg] || msg) : (msg || '（暂无数据）');
  s += text(W / 2, H / 2, shown, t, { size: 13, color: t.muted, anchor: 'middle' });
  return s + svgClose();
}

const r4 = (n) => Math.round(n);

/** 由点数组生成闭合 polygon 的 path d。 */
function polyPath(pts) {
  if (!pts.length) return '';
  return 'M' + pts.map((p) => `${r4(p[0])},${r4(p[1])}`).join(' L') + ' Z';
}

// ---------------------------------------------------------------------------
// 1. 象限图 Quadrant
//    输入 CSV：名称,x,y（首行可带表头）。两轴交叉于数据范围中点，画十字轴 + 四点。
//    第 1 个点为 accent 焦点。轴标签可用 opts.xLabel / opts.yLabel。
// ---------------------------------------------------------------------------
export function renderQuadrant(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const rows = stripHeader(parseCSV(data));
  const pts = [];
  for (const r of rows) {
    if (r.length < 3) continue;
    const x = parseFloat(r[1]);
    const y = parseFloat(r[2]);
    if (!isFinite(x) || !isFinite(y)) continue;
    pts.push({ name: r[0], x, y });
  }
  if (!pts.length) return emptyChart(opts, t, '（请输入“名称,x,y”格式的数据）');

  let minX = Math.min(...pts.map((p) => p.x));
  let maxX = Math.max(...pts.map((p) => p.x));
  let minY = Math.min(...pts.map((p) => p.y));
  let maxY = Math.max(...pts.map((p) => p.y));
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }

  const W = opts.w || 860;
  const H = opts.h || 520;
  const { s: titleS, top } = titleBlock(opts, t);
  const x0 = 120, x1 = W - 120, y0 = top + 30, y1 = H - 96;
  const xMid = (minX + maxX) / 2;
  const yMid = (minY + maxY) / 2;
  const sx = scale(minX, maxX, x0, x1);
  const sy = scale(minY, maxY, y1, y0);
  const cx = sx(xMid);
  const cy = sy(yMid);

  let s = svgOpen(W, H, t) + titleS;

  // 十字轴（无箭头，克制强调色）
  s += line(cx, y0, cx, y1, t, { color: t._rgba(t.ink, 0.4), width: 1 });
  s += line(x0, cy, x1, cy, t, { color: t._rgba(t.ink, 0.4), width: 1 });

  // 轴端标签（Jobs-minimal：单字/短语，置于轴端之外）
  const en = opts.lang === 'en';
  const xLabel = opts.xLabel || (en ? 'X axis' : 'X 轴');
  const yLabel = opts.yLabel || (en ? 'Y axis' : 'Y 轴');
  s += text(x1 + 8, cy - 8, xLabel, t, { size: 11, color: t.muted, anchor: 'start' });
  s += text(cx, y0 - 10, yLabel, t, { size: 11, color: t.muted, anchor: 'middle' });

  // 点（第 1 个为 accent 焦点）
  pts.forEach((p, i) => {
    const px = sx(p.x);
    const py = sy(p.y);
    const focal = i === 0;
    s += circle(px, py, focal ? 6 : 4, focal ? t.accent : t.ink);
    const right = px >= cx;
    const dx = right ? 10 : -10;
    const anchor = right ? 'start' : 'end';
    // 避开轴：靠近轴时把标签推远
    const offY = Math.abs(px - cx) < 12 ? (py >= cy ? 14 : -10) : -6;
    s += text(px + dx, py + offY, p.name, t, { size: 11, weight: focal ? '600' : '400', color: focal ? t.accent : t.ink, anchor });
  });

  // 图例
  const ly = H - 36;
  s += line(64, ly - 16, W - 64, ly - 16, t, { color: t._rgba(t.ink, 0.1), width: 1 });
  s += circle(72, ly - 2, 6, t.accent);
  s += text(86, ly + 2, opts.lang === 'en' ? 'Focus' : '焦点', t, { size: 11, color: t.muted });
  s += circle(150, ly - 2, 4, t.ink);
  s += text(164, ly + 2, opts.lang === 'en' ? 'Item' : '项目', t, { size: 11, color: t.muted });

  return s + svgClose();
}

// ---------------------------------------------------------------------------
// 2. 雷达图 Radar
//    输入 CSV：第一列=轴名，其余列=各系列数值。
//    如：维度,产品A,产品B\n速度,4,3\n价格,3,5\n质量,5,4
//    每系列一条多边形；accent 给焦点系列（首个），其余用 palette 描边；含轴网与标签。
// ---------------------------------------------------------------------------
export function renderRadar(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const rows = parseCSV(data);
  if (rows.length < 4) return emptyChart(opts, t, '（雷达图需要表头 + 至少 3 行轴数据）');
  const header = rows[0];
  const seriesNames = header.slice(1).filter((c) => c !== '');
  if (seriesNames.length < 1) return emptyChart(opts, t, '（请至少给出 1 个系列列）');
  const axes = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    const vals = seriesNames.map((_, j) => parseFloat(r[j + 1]));
    if (vals.some((v) => !isFinite(v))) continue;
    axes.push({ name: r[0], vals });
  }
  const N = axes.length;
  if (N < 3) return emptyChart(opts, t, '（雷达图需要 3–5 个轴）');

  let rawMax = 0;
  for (const a of axes) for (const v of a.vals) rawMax = Math.max(rawMax, v);
  const S = niceScale(0, rawMax || 1, 5).max || 1;

  const W = opts.w || 860;
  const H = opts.h || 520;
  const { s: titleS, top } = titleBlock(opts, t);
  const cx = W / 2;
  const cy = top + Math.floor((H - top - 90) / 2);
  let R = Math.floor(Math.min((W - 180) / 2, (H - top - 120) / 2));
  R = Math.max(120, R - (R % 4));

  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const vertex = (i, f) => [cx + f * R * Math.cos(ang(i)), cy + f * R * Math.sin(ang(i))];

  let s = svgOpen(W, H, t) + titleS;

  // 同心网格环（0.2–1.0）
  const fracs = [0.2, 0.4, 0.6, 0.8, 1.0];
  fracs.forEach((f, k) => {
    const pts = [];
    for (let i = 0; i < N; i++) pts.push(vertex(i, f));
    const stroke = k === fracs.length - 1 ? t._rgba(t.ink, 0.2) : t._rgba(t.ink, 0.1);
    s += path(polyPath(pts), { stroke, fill: 'none', sw: 1 });
  });

  // 轴辐（中心→外顶点，无箭头）
  for (let i = 0; i < N; i++) {
    const o = vertex(i, 1);
    s += line(cx, cy, o[0], o[1], t, { color: t._rgba(t.ink, 0.2), width: 1 });
  }

  // 轴标签（每辐一词，置于外环之外）
  axes.forEach((a, i) => {
    const o = vertex(i, 1);
    const lx = cx + (R + 28) * Math.cos(ang(i));
    const ly = cy + (R + 28) * Math.sin(ang(i));
    const c = Math.cos(ang(i));
    let anchor = 'middle';
    if (c > 0.3) anchor = 'start';
    else if (c < -0.3) anchor = 'end';
    const dy = Math.sin(ang(i)) < 0 ? -4 : 12;
    s += text(lx, ly + dy, a.name, t, { size: 11, weight: '600', color: t.ink, anchor });
  });

  // 首轴刻度（仅顶轴）
  fracs.forEach((f) => {
    const val = f * S;
    const y = cy - f * R;
    s += text(cx - 6, y + 3, String(r4(val)), t, { size: 8, color: t.muted, anchor: 'end' });
  });

  // 系列调色板（焦点=accent，其余取语义 token 派生）
  const pal = [t.accent2, t.muted, t.ink, t._rgba(t.accent2, 0.7), t._rgba(t.muted, 0.6)];
  const order = [];
  for (let j = 0; j < seriesNames.length; j++) {
    const vals = axes.map((a) => a.vals[j]);
    const pts = vals.map((v, i) => {
      const f = S > 0 ? v / S : 0;
      return vertex(i, Math.max(0, Math.min(1, f)));
    });
    const focal = j === 0;
    const col = focal ? t.accent : pal[(j - 1) % pal.length];
    order.push({ name: seriesNames[j], col, focal, vals });
    s += path(polyPath(pts), { stroke: col, fill: t._rgba(col, 0.18), sw: focal ? 1.8 : 1.5 });
  }

  // 焦点系列顶点圆点（仅焦点）
  const focal = order.find((o) => o.focal);
  if (focal) {
    focal.vals.forEach((v, i) => {
      const f = S > 0 ? v / S : 0;
      const p = vertex(i, Math.max(0, Math.min(1, f)));
      s += circle(p[0], p[1], 4, focal.col);
    });
  }

  // 图例（底部）
  const ly = H - 28;
  let lx = 64;
  order.forEach((o) => {
    s += rect(lx, ly - 8, 16, 8, t, { fill: t._rgba(o.col, 0.18), stroke: o.col, sw: 1.5 });
    const label = o.name + (o.focal ? (opts.lang === 'en' ? ' · Recommended' : ' · 推荐') : '');
    s += text(lx + 24, ly - 1, label, t, { size: 11, color: t.muted });
    lx += 24 + textWidthPx(label, 11) + 28;
  });

  return s + svgClose();
}

// ---------------------------------------------------------------------------
// 3. 极坐标图 Polar（放射棒棒糖 / lollipop）
//    输入 CSV：类别,值。如：一月,30\n二月,55
//    角度=类别(4–8)，半径=数值(0..max)。非焦点 muted，焦点 accent。
// ---------------------------------------------------------------------------
export function renderPolar(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const rows = stripHeader(parseCSV(data));
  const cats = [];
  for (const r of rows) {
    if (r.length < 2) continue;
    const v = parseFloat(r[1]);
    if (!isFinite(v)) continue;
    cats.push({ label: r[0], v: Math.max(0, v) });
  }
  if (cats.length < 4) return emptyChart(opts, t, '（极坐标图需要 4–8 个“类别,值”数据）');

  let rawMax = Math.max(...cats.map((c) => c.v), 0);
  const S = niceScale(0, rawMax || 1, 5).max || 1;

  const W = opts.w || 860;
  const H = opts.h || 520;
  const { s: titleS, top } = titleBlock(opts, t);
  const cx = W / 2;
  const cy = top + Math.floor((H - top - 100) / 2);
  let R = Math.floor(Math.min((W - 200) / 2, (H - top - 140) / 2));
  R = Math.max(120, R - (R % 4));

  const N = cats.length;
  // 焦点：opts.focal(1-based) 或 数值最大者
  let focalIdx = (opts.focal ? opts.focal - 1 : cats.findIndex((c) => c.v === rawMax));
  if (focalIdx < 0 || focalIdx >= N) focalIdx = 0;

  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;

  let s = svgOpen(W, H, t) + titleS;

  // 同心网格环（0.2–1.0 半径）
  const fracs = [0.2, 0.4, 0.6, 0.8, 1.0];
  fracs.forEach((f, k) => {
    s += circle(cx, cy, R * f, 'none', {
      stroke: k === fracs.length - 1 ? t._rgba(t.ink, 0.2) : t._rgba(t.ink, 0.1), sw: 1,
    });
  });

  // 类别辐
  for (let i = 0; i < N; i++) {
    const o = [cx + R * Math.cos(ang(i)), cy + R * Math.sin(ang(i))];
    s += line(cx, cy, o[0], o[1], t, { color: t._rgba(t.ink, 0.16), width: 1 });
  }

  // 首轴刻度（仅顶轴，0.2×max … 1.0×max）
  fracs.forEach((f) => {
    const val = f * S;
    const y = cy - f * R;
    s += text(cx - 6, y + 3, String(r4(val)), t, { size: 8, color: t.muted, anchor: 'end' });
  });
  s += text(cx + 6, cy + 3, '0', t, { size: 8, color: t.muted });

  // 棒棒糖射线 + 端点
  cats.forEach((c, i) => {
    const f = S > 0 ? c.v / S : 0;
    const ex = cx + f * R * Math.cos(ang(i));
    const ey = cy + f * R * Math.sin(ang(i));
    const focal = i === focalIdx;
    const col = focal ? t.accent : t.muted;
    if (c.v > 0) {
      s += line(cx, cy, ex, ey, t, { color: col, width: focal ? 2.4 : 2 });
      s += circle(ex, ey, focal ? 5 : 4, t.paper, { stroke: col, sw: 1.2 });
    }
    // 类别标签（水平，环外）
    const lx = cx + (R + 24) * Math.cos(ang(i));
    const ly = cy + (R + 24) * Math.sin(ang(i));
    const c2 = Math.cos(ang(i));
    let anchor = 'middle';
    if (c2 > 0.3) anchor = 'start';
    else if (c2 < -0.3) anchor = 'end';
    const dy = Math.sin(ang(i)) < 0 ? -4 : 12;
    s += text(lx, ly + dy, c.label, t, { size: 11, weight: '600', color: t.ink, anchor });
    // 数值标签
    const vx = cx + (R + 42) * Math.cos(ang(i));
    const vy = cy + (R + 42) * Math.sin(ang(i));
    const vdy = Math.sin(ang(i)) < 0 ? -4 : 12;
    s += text(vx, vy + vdy, String(c.v), t, { size: 8, color: t.muted, anchor });
  });

  // 来源/单位备注
  const note = opts.subtitle || (opts.unit ? `单位：${opts.unit} · 0–${r4(S)}` : '');
  if (note) s += text(64, H - 24, note, t, { size: 9, color: t.muted });

  return s + svgClose();
}

// ---------------------------------------------------------------------------
// 4. 韦恩图 Venn（2 或 3 个集合，可选交集数值）
//    输入：A: 客户\nB: 渠道\nC: 产品\n交集: A,B = 12
//    画重叠圆，标注集合名与交集数值；其一交集为 accent 焦点。
// ---------------------------------------------------------------------------
export function renderVenn(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const lines = String(data || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
  const sets = [];
  const inters = []; // { members:[ids], label }
  for (const line0 of lines) {
    if (/^(交集|intersection|inter)/i.test(line0)) {
      // 交集: A,B = 12
      const body = line0.replace(/^(交集|intersection|inter)\s*[:：]?/i, '').trim();
      let label = '';
      let left = body;
      const eq = body.split(/=|=/).map((x) => x.trim());
      if (eq.length >= 2) { left = eq[0]; label = eq.slice(1).join('='); }
      else label = body;
      const members = left.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
      if (members.length >= 2) inters.push({ members, label });
    } else if (/[:：]/.test(line0)) {
      const idx = line0.indexOf(line0.includes('：') ? '：' : ':');
      const id = line0.slice(0, idx).trim();
      const name = line0.slice(idx + 1).trim();
      if (id && name) sets.push({ id, name });
    }
  }
  if (sets.length < 2) return emptyChart(opts, t, '（韦恩图需要至少 2 个集合，如 A: 客户）');

  const setColors = [t.ink, t.muted, t.accent2];

  const W = opts.w || 860;
  const H = opts.h || 520;
  const { s: titleS, top } = titleBlock(opts, t);

  // 圆心与半径（4 的倍数）
  const R = 140;
  const cx = Math.round((W / 2) / 4) * 4;
  const cy = Math.round((top + (H - top) / 2 + 20) / 4) * 4;
  let centers = [];
  if (sets.length === 2) {
    const d = 150;
    centers = [
      [cx - d / 2, cy],
      [cx + d / 2, cy],
    ];
  } else {
    const d = Math.round((R * 0.9) / 4) * 4;
    const angs = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];
    centers = angs.map((a) => [cx + d * Math.cos(a), cy + d * Math.sin(a)]);
  }

  let s = svgOpen(W, H, t) + titleS;

  // 圆（描边发丝线 + 极低透明度填充，重叠自然叠加）
  sets.forEach((set, i) => {
    const col = setColors[i % setColors.length];
    const [x, y] = centers[i];
    s += circle(x, y, R, t._rgba(col, 0.04), { stroke: col, sw: 1 });
  });

  // 交集 focal（取含全部集合者，否则第一个）——accent 填充 + 文本
  let focalInter = inters.find((it) => it.members.length === sets.length)
    || inters[0] || null;

  // 三元交集裁剪填充（accent tint）
  const byId = new Map(sets.map((st) => [st.id, st]));
  if (focalInter && focalInter.members.length === 3 && sets.length === 3) {
    const ids = focalInter.members.slice(0, 3).map((m) => byId.get(m) ? sets.indexOf(byId.get(m)) : -1).filter((k) => k >= 0);
    if (ids.length === 3) {
      const c0 = centers[ids[0]], c1 = centers[ids[1]], c2 = centers[ids[2]];
      s += `<defs><clipPath id="cf-venn-a"><circle cx="${r4(c0[0])}" cy="${r4(c0[1])}" r="${R}"/></clipPath>`;
      s += `<clipPath id="cf-venn-b"><circle cx="${r4(c1[0])}" cy="${r4(c1[1])}" r="${R}"/></clipPath></defs>`;
      s += `<g clip-path="url(#cf-venn-a)"><g clip-path="url(#cf-venn-b)"><circle cx="${r4(c2[0])}" cy="${r4(c2[1])}" r="${R}" fill="${t._rgba(t.accent, 0.10)}"/></g></g>`;
    }
  }

  // 集合名（置于各自非重叠 lobe）
  const lobe = (i) => {
    if (sets.length === 2) {
      return i === 0 ? [centers[0][0] - R * 0.55, centers[0][1]] : [centers[1][0] + R * 0.55, centers[1][1]];
    }
    // 3 个：顶/左下/右下
    const dx = [0, -R * 0.55, R * 0.55];
    const dy = [-R * 0.62, R * 0.5, R * 0.5];
    return [centers[i][0] + dx[i], centers[i][1] + dy[i]];
  };
  sets.forEach((set, i) => {
    const [lx, ly] = lobe(i);
    s += text(lx, ly - 4, set.name, t, { size: 14, weight: '600', color: t.ink, anchor: 'middle' });
  });

  // 交集标签（置于重叠中心）
  const overlapCenter = (members) => {
    const idxs = members.map((m) => (byId.get(m) ? sets.indexOf(byId.get(m)) : -1)).filter((k) => k >= 0);
    if (!idxs.length) return [cx, cy];
    let sx = 0, sy = 0;
    for (const k of idxs) { sx += centers[k][0]; sy += centers[k][1]; }
    return [sx / idxs.length, sy / idxs.length];
  };
  inters.forEach((it) => {
    const [ix, iy] = overlapCenter(it.members);
    const focal = it === focalInter;
    s += text(ix, iy + 4, it.label, t, { size: 13, weight: '600', color: focal ? t.accent : t.ink, anchor: 'middle' });
  });

  return s + svgClose();
}

// ---------------------------------------------------------------------------
// 5. 金字塔 / 漏斗 Pyramid（对称梯形堆叠）
//    输入 CSV：层级,值。如：顶层,100\n中层,60\n底层,30
//    opts.type: 'pyramid'(默认, 顶端收尖) | 'funnel'(底端收尖)。宽度按数值等比。
//    顶层为 accent 焦点；含名称与数值标签。
// ---------------------------------------------------------------------------
export function renderPyramid(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const rows = stripHeader(parseCSV(data));
  const layers = [];
  for (const r of rows) {
    if (r.length < 2) continue;
    const v = parseFloat(r[1]);
    if (!isFinite(v)) continue;
    layers.push({ name: r[0], v: Math.max(0, v) });
  }
  if (layers.length < 2) return emptyChart(opts, t, '（金字塔需要至少 2 行“层级,值”数据）');

  const mode = opts.type === 'funnel' ? 'funnel' : 'pyramid';
  const W = opts.w || 860;
  const H = opts.h || 520;
  const { s: titleS, top } = titleBlock(opts, t);
  const left = 140, right = 170;
  const plotTop = top + 24;
  const plotBot = H - 80;
  const ph = plotBot - plotTop;
  const pw = W - left - right;
  const cx = left + pw / 2;

  let maxV = Math.max(...layers.map((l) => l.v), 0);
  if (maxV <= 0) maxV = 1;
  const widths = layers.map((l) => (l.v / maxV) * pw);

  let lh = Math.floor(ph / layers.length);
  lh = Math.max(32, Math.floor(lh / 4) * 4);

  const n = layers.length;
  const topW = (i) => (mode === 'pyramid' ? (i === 0 ? 0 : widths[i - 1]) : widths[i]);
  const botW = (i) => (mode === 'pyramid' ? widths[i] : (i === n - 1 ? 0 : widths[i + 1]));

  let s = svgOpen(W, H, t) + titleS;

  // 左侧方向轴（微弱，仅作阅读提示）
  s += line(left - 28, plotTop, left - 28, plotBot, t, { color: t._rgba(t.ink, 0.25), width: 1 });
  s += path(`M${left - 32},${plotTop} L${left - 24},${plotTop} L${left - 28},${plotTop - 10} Z`, { fill: t._rgba(t.ink, 0.45) });
  s += text(left - 28, plotTop - 18, opts.yLabel || (mode === 'funnel' ? (opts.lang === 'en' ? 'Conv. ↓' : '转化 ↓') : (opts.lang === 'en' ? 'Rare ↑' : '稀有 ↑')), t,
    { size: 8, color: t.muted, anchor: 'middle' });

  // 各层梯形
  layers.forEach((l, i) => {
    const yT = plotTop + i * lh;
    const yB = yT + lh;
    const tw = topW(i);
    const bw = botW(i);
    const focal = i === 0;
    const pts = [
      [cx - tw / 2, yT], [cx + tw / 2, yT], [cx + bw / 2, yB], [cx - bw / 2, yB],
    ];
    const fill = focal ? t.accentTint : t._rgba(t.ink, 0.04 + 0.015 * i);
    const stroke = focal ? t.accent : t._rgba(t.ink, 0.2);
    s += path(polyPath(pts), { fill, stroke, sw: 1 });
    // 名称（居中）
    s += text(cx, yT + lh / 2 - 2, l.name, t, { size: 13, weight: '600', color: t.ink, anchor: 'middle' });
    // 数值（右侧注释）
    s += text(cx + pw / 2 + 12, yT + lh / 2 + 4, String(l.v), t, { size: 11, color: t.muted, anchor: 'start' });
  });

  // 图例
  const ly = H - 28;
  s += line(64, ly - 16, W - 64, ly - 16, t, { color: t._rgba(t.ink, 0.1), width: 1 });
  s += rect(72, ly - 10, 16, 12, t, { fill: t.accentTint, stroke: t.accent, sw: 1 });
  s += text(96, ly - 1, opts.lang === 'en' ? 'Focus tier' : '焦点层', t, { size: 11, color: t.muted });
  s += rect(180, ly - 10, 16, 12, t, { fill: t._rgba(t.ink, 0.05), stroke: t._rgba(t.ink, 0.25), sw: 1 });
  s += text(204, ly - 1, opts.lang === 'en' ? 'Support tier' : '支撑层', t, { size: 11, color: t.muted });

  return s + svgClose();
}

// 文本宽度估算（仅用于图例排版，与 shapes.textWidth 一致：CJK=1em，其余≈0.6em）
function textWidthPx(str, size = 11) {
  let w = 0;
  for (const ch of String(str)) w += /[　-鿿豈-﫿]/.test(ch) ? size : size * 0.6;
  return w;
}
