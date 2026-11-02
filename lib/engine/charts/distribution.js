// ===========================================================================
// distribution.js — 编辑级"分布/分解"图型渲染器（继承 diagram-design 设计铁律）
//   · 瀑布图 Waterfall     累积浮动柱 + 连线衔接
//   · 树图 Treemap         按值占比的 squarified 矩形
//   · 热力图 Heatmap       矩阵单色阶 + 1 个焦点格
//   · DP 安全矩阵         角色×组件权限矩阵（R/W/-/× 配色 + 图例）
// 设计铁律：无阴影、发丝线、4px 栅格、克制强调色、CJK 安全、健壮不抛错。
// 所有函数返回自包含 SVG 字符串。
// ===========================================================================
import { svgOpen, svgClose, text, line, rect, esc } from '../base.js';
import { expandTheme, textWidth } from '../diagrams/shapes.js';

// ---- 通用工具 --------------------------------------------------------------

/** 四舍五入到 1 位小数，非有限值归零（杜绝 NaN / undefined 进入 SVG）。 */
const r1 = (n) => {
  const v = Number(n);
  return isFinite(v) ? Math.round(v * 10) / 10 : 0;
};

/** 数字格式化：整数不显示小数，否则 1 位。 */
const fmt = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

/** 多语言文案：opts.lang === 'en' 用英文，否则中文。 */
const L = (opts, zh, en) => (opts && opts.lang === 'en' ? en : zh);

/** 截断过长的类别名，避免出框。 */
const trunc = (s, n) => {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

/** 解析 CSV（逗号分隔，去掉空行）。 */
function parseCSV(data) {
  const lines = String(data == null ? '' : data)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length);
  return lines.map((l) => l.split(',').map((c) => c.trim()));
}

/** 解析矩阵 CSV：首行=列标题（首格空），首列=行标题，其余=单元格。 */
function parseMatrix(data) {
  const grid = parseCSV(data);
  if (grid.length < 2) return null;
  const colHeaders = grid[0].slice(1);
  const rows = [];
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    const name = r[0] || `R${i}`;
    const vals = r.slice(1);
    rows.push({ name, vals });
  }
  if (!rows.length || !colHeaders.length) return null;
  return { colHeaders, rows };
}

/** 空数据兜底：返回一张带提示的有效 SVG，绝不抛错。 */
function emptyChart(opts, theme, msg) {
  const W = (opts && opts.w) || 860;
  const H = (opts && opts.h) || 520;
  let s = svgOpen(W, H, theme);
  if (opts && opts.title) s += text(40, 40, esc(opts.title), theme, { size: 20, weight: '700' });
  s += text(40, Math.round(H / 2), msg || L(opts, '暂无数据 No data', 'No data'), theme, {
    size: 14,
    color: (theme && theme.muted) || '#6b7280',
  });
  return s + svgClose();
}

/** 图例行：items=[{fill,stroke,label}]，返回 SVG 片段。 */
function legendRow(items, x, y, theme, t) {
  let s = '';
  let cx = x;
  for (const it of items) {
    const lw = textWidth(it.label, 9);
    s += rect(cx, y - 8, 16, 10, theme, { fill: it.fill, stroke: it.stroke, sw: 1, rx: 2 });
    s += text(cx + 22, y + 1, it.label, theme, { size: 9, color: t.muted });
    cx += 22 + lw + 24;
  }
  return s;
}

// ===========================================================================
// 瀑布图 Waterfall
// 输入 CSV：首行=基准绝对值，其余=增减量（带正负号），末行可为合计。
// 例：收入,200\n成本,-80\n利润,120
// ===========================================================================
export function renderWaterfall(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const rows = parseCSV(data);
  if (rows.length < 2 || !rows[0][1]) return emptyChart(opts, theme, L(opts, '数据不足 No data', 'No data'));

  const totalKw = /合计|总计|小计|总計|total|sum|期末|终值|end|final/i;
  const focalKw = /重点|关键|焦点|focal|largest|最大/i;

  // 解析每一行：{name, raw, num, role:'base'|'delta'|'total', isFocal}
  const items = [];
  let focalCount = 0;
  rows.forEach((r, i) => {
    const name = r[0] || `R${i}`;
    const raw = r[1] || '0';
    const num = Number(raw);
    let role;
    if (i === 0) role = 'base';
    else if (totalKw.test(name)) role = 'total';
    else role = 'delta';
    const isFocal = (opts.focal != null && (opts.focal === name || opts.focal === i)) ||
      (opts.focal == null && focalKw.test(name) && focalCount < 1);
    if (isFocal) focalCount++;
    items.push({ name, raw, num: isFinite(num) ? num : 0, role, isFocal });
  });

  // 计算累积运行值与域
  let running = items[0].role === 'base' ? items[0].num : 0;
  const bars = [];
  let dMax = running;
  let dMin = Math.min(0, running);
  items.forEach((it) => {
    if (it.role === 'base' || it.role === 'total') {
      const val = it.num;
      bars.push({ ...it, before: val, after: val, value: val });
      running = val;
    } else {
      const before = running;
      const after = before + it.num;
      bars.push({ ...it, before, after, value: it.num });
      running = after;
    }
    dMax = Math.max(dMax, bars[bars.length - 1].after);
    dMin = Math.min(dMin, bars[bars.length - 1].after);
  });
  if (dMax <= dMin) dMax = dMin + 1;

  // 布局
  const W = opts.w || 860;
  const H = opts.h || 520;
  const showTitle = opts.showTitle !== false;
  const m = { top: showTitle ? 72 : 44, right: 40, bottom: 76, left: 80 };
  const pw = W - m.left - m.right;
  const ph = H - m.top - m.bottom;
  const baseY = m.top + ph; // 0 基线
  const yScale = niceAuto(dMin, dMax, 5);
  const yOf = (v) => baseY - ((v - yScale.min) / (yScale.max - yScale.min)) * ph;

  let s = svgOpen(W, H, theme);
  if (showTitle) {
    s += text(m.left, 40, esc(opts.title || L(opts, '瀑布图 Waterfall', 'Waterfall')), theme, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(m.left, 58, esc(opts.subtitle), theme, { size: 12, color: t.muted });
  }

  // Y 轴网格 + 刻度
  yScale.ticks.forEach((tv) => {
    const y = yOf(tv);
    if (y < m.top - 0.5 || y > baseY + 0.5) return;
    s += line(m.left, y, m.left + pw, y, theme, { color: t.grid, width: 1 });
    s += text(m.left - 10, y + 4, fmt(tv), theme, { size: 10, color: t.gridText, anchor: 'end' });
  });
  // 轴线
  s += line(m.left, m.top, m.left, baseY, theme, { color: t.ruleSolid, width: 1 });
  s += line(m.left, baseY, m.left + pw, baseY, theme, { color: t.ruleSolid, width: 1 });

  // 柱几何
  const n = bars.length;
  const pitch = pw / n;
  const barW = Math.max(24, Math.round((pitch * 0.6) / 4) * 4);
  const centers = bars.map((_, i) => m.left + pitch * (i + 0.5));
  const xs = centers.map((c) => Math.round(c - barW / 2));

  // 先画连线（carry），位于柱之下
  for (let i = 0; i < n - 1; i++) {
    const lvl = yOf(bars[i].after);
    s += line(xs[i] + barW, r1(lvl), xs[i + 1], r1(lvl), theme, { color: t._rgba(t.ink, 0.5), width: 1 });
  }

  // 画柱
  const hasFocal = bars.some((b) => b.isFocal);
  bars.forEach((b, i) => {
    const x = xs[i];
    let yTop, h, fill, stroke, labelColor, labelStr;
    if (b.role === 'base' || b.role === 'total') {
      yTop = yOf(b.value);
      h = baseY - yTop;
      fill = t._rgba(t.ink, 0.08);
      stroke = t.ink;
      labelColor = t.muted;
      labelStr = fmt(b.value);
    } else if (b.num >= 0) {
      // 增加：从 before 升到 after
      yTop = yOf(b.after);
      h = yOf(b.before) - yTop;
      fill = b.isFocal ? t._rgba(t.accent, 0.12) : t._rgba(t.muted, 0.15);
      stroke = b.isFocal ? t.accent : t.muted;
      labelColor = b.isFocal ? t.accent : t.muted;
      labelStr = '+' + fmt(b.num);
    } else {
      // 减少：空心（纸底），从 before 落到 after
      yTop = yOf(b.before);
      h = yOf(b.after) - yTop;
      fill = b.isFocal ? t._rgba(t.accent, 0.12) : t.paper;
      stroke = b.isFocal ? t.accent : t.muted;
      labelColor = b.isFocal ? t.accent : t.muted;
      labelStr = fmt(b.num);
    }
    yTop = r1(yTop);
    h = Math.max(0, r1(h));
    s += rect(x, yTop, barW, h, theme, { fill, stroke, sw: 1, rx: 1 });
    // 数值标签
    const cx = r1(x + barW / 2);
    if (b.role === 'base' || b.role === 'total') {
      s += text(cx, yTop - 8, labelStr, theme, { size: 11, color: labelColor, anchor: 'middle', weight: '600' });
    } else if (b.num >= 0) {
      s += text(cx, yTop - 8, labelStr, theme, { size: 11, color: labelColor, anchor: 'middle', weight: '600' });
    } else {
      s += text(cx, yTop + h + 14, labelStr, theme, { size: 11, color: labelColor, anchor: 'middle', weight: '600' });
    }
    // 类别标签
    s += text(cx, baseY + 20, trunc(b.name, Math.max(4, Math.round(barW / 8))), theme, {
      size: 11,
      color: t.ink,
      anchor: 'middle',
      weight: '600',
    });
  });

  // 图例
  if (opts.legend !== 'none') {
    const ly = baseY + 40;
    s += line(m.left, ly - 8, m.left + pw, ly - 8, theme, { color: t.rule, width: 0.8 });
    s += text(m.left, ly + 8, L(opts, '图例 LEGEND', 'LEGEND'), theme, { size: 8, color: t.muted });
    const items = [
      { fill: t._rgba(t.ink, 0.08), stroke: t.ink, label: L(opts, '合计/基准', 'Total / base') },
      { fill: t._rgba(t.muted, 0.15), stroke: t.muted, label: L(opts, '增加', 'Increase') },
      { fill: t.paper, stroke: t.muted, label: L(opts, '减少', 'Decrease') },
    ];
    if (hasFocal) items.push({ fill: t._rgba(t.accent, 0.12), stroke: t.accent, label: L(opts, '重点项', 'Focal') });
    s += legendRow(items, m.left + 90, ly + 8, theme, t);
  }

  return s + svgClose();
}

// ===========================================================================
// 树图 Treemap
// 输入 CSV：类别,值（多行）。例：A,40\nB,25\nC,20\nD,15
// 按值占比画 squarified 矩形，1–2 个焦点块用 accent。
// ===========================================================================
export function renderTreemap(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const rows = parseCSV(data);
  const items = [];
  for (const r of rows) {
    if (r.length < 2) continue;
    const v = Number(r[1]);
    if (!isFinite(v) || v <= 0) continue;
    items.push({ name: r[0] || '?', value: v });
  }
  if (items.length < 1) return emptyChart(opts, theme);

  // 焦点选择（最多 2 个）
  const focalKw = /重点|关键|焦点|focal|key/i;
  const focalSet = new Set();
  if (opts.focal != null) {
    const arr = Array.isArray(opts.focal) ? opts.focal : [opts.focal];
    arr.forEach((f) => focalSet.add(typeof f === 'number' ? f : String(f)));
  }
  let focalUsed = 0;
  const isFocal = (name, idx) =>
    (focalSet.has(idx) || focalSet.has(name) || (opts.focal == null && focalKw.test(name))) && focalUsed < 2
      ? (focalUsed++, true)
      : false;

  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  // 布局
  const W = opts.w || 860;
  const H = opts.h || 520;
  const showTitle = opts.showTitle !== false;
  const m = { top: showTitle ? 72 : 44, right: 40, bottom: 72, left: 40 };
  const X = m.left, Y = m.top, PW = W - m.left - m.right, PH = H - m.top - m.bottom;
  const rects = squarify(items, X, Y, PW, PH);

  let s = svgOpen(W, H, theme);
  if (showTitle) {
    s += text(m.left, 40, esc(opts.title || L(opts, '树图 Treemap', 'Treemap')), theme, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(m.left, 58, esc(opts.subtitle), theme, { size: 12, color: t.muted });
  }

  // 按面积降序分配 ink 不透明度档（强对比=大）
  const sorted = rects.slice().sort((a, b) => b.area - a.area);
  const ramp = sorted.map((_, i) => 0.16 - (0.16 - 0.05) * (sorted.length > 1 ? i / (sorted.length - 1) : 0));

  rects.forEach((rc, idx) => {
    const focal = isFocal(rc.name, idx);
    // 4px 网格：内缩 2px 形成间隙
    const gx = r1(rc.x + 2), gy = r1(rc.y + 2), gw = r1(Math.max(2, rc.w - 4)), gh = r1(Math.max(2, rc.h - 4));
    const share = ((rc.value / total) * 100).toFixed(0);
    const fill = focal ? t._rgba(t.accent, 0.16) : t._rgba(t.ink, ramp[sorted.indexOf(rc)]);
    const stroke = focal ? t.accent : t.ruleSolid;
    const sw = focal ? 1.5 : 1;
    s += rect(gx, gy, gw, gh, theme, { fill, stroke, sw, rx: 2, 'data-share': share });
    // 标签分级
    if (gw > 48 && gh > 20) {
      const nx = gx + 16, ny = gy + 28;
      s += text(nx, ny, trunc(rc.name, Math.round(gw / 8)), theme, { size: 13, color: t.ink, weight: '600' });
      if (gw > 64 && gh > 36) {
        s += text(nx, ny + 18, `${fmt(rc.value)} · ${share}%`, theme, { size: 9, color: t.muted });
      }
    } else if (gw >= 12 && gh >= 12) {
      // 小格用信息点
      s += circle(r1(gx + gw / 2), r1(gy + gh / 2), 5, t.ink);
    }
  });

  // 图例
  if (opts.legend !== 'none') {
    const ly = H - 44;
    s += line(m.left, ly - 8, W - m.right, ly - 8, theme, { color: t.rule, width: 0.8 });
    s += text(m.left, ly + 8, L(opts, '图例 LEGEND', 'LEGEND'), theme, { size: 8, color: t.muted });
    const items = [
      { fill: t._rgba(t.ink, 0.16), stroke: t.ruleSolid, label: L(opts, '面积=数值，强对比更大', 'Area = value; stronger = larger') },
    ];
    if (focalUsed > 0) items.push({ fill: t._rgba(t.accent, 0.16), stroke: t.accent, label: L(opts, '焦点块', 'Focal') });
    s += legendRow(items, m.left + 90, ly + 8, theme, t);
  }

  return s + svgClose();
}

// ===========================================================================
// 热力图 Heatmap
// 输入矩阵 CSV：首行=列标题（首格空），首列=行标题，其余=数值。
// 例：,Jan,Feb\nA,3,5\nB,2,8
// 单元格按数值映射浅→深的单色阶，1 个焦点格用 accent；画图例。
// ===========================================================================
export function renderHeatmap(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const mtx = parseMatrix(data);
  if (!mtx) return emptyChart(opts, theme);
  const { colHeaders, rows } = mtx;
  const nCols = colHeaders.length;
  const nRows = rows.length;

  // 取值 + 焦点
  const grid = [];
  let maxV = 0;
  rows.forEach((r) => {
    const rowVals = [];
    for (let j = 0; j < nCols; j++) {
      const v = Number(r.vals[j]);
      const val = isFinite(v) && v >= 0 ? v : 0;
      rowVals.push(val);
      if (val > maxV) maxV = val;
    }
    grid.push(rowVals);
  });

  // 焦点格：opts.focal = "行名,列名" 或 [rIndex,cIndex]
  let focalRC = null;
  if (opts.focal != null) {
    if (Array.isArray(opts.focal)) focalRC = [opts.focal[0], opts.focal[1]];
    else {
      const parts = String(opts.focal).split(',');
      if (parts.length === 2) {
        const ri = rows.findIndex((r) => r.name === parts[0]);
        const ci = colHeaders.indexOf(parts[1]);
        if (ri >= 0 && ci >= 0) focalRC = [ri, ci];
      }
    }
  }

  // 布局
  const W = opts.w || 860;
  const H = opts.h || 520;
  const showTitle = opts.showTitle !== false;
  const left = 140, topPad = 40, right = 40, bottom = 120;
  const plotTop = (showTitle ? 72 : 44) + topPad;
  const plotW = W - left - right;
  const plotH = H - plotTop - bottom;
  const gap = 4;
  const cellW = (plotW - (nCols - 1) * gap) / nCols;
  const cellH = (plotH - (nRows - 1) * gap) / nRows;

  let s = svgOpen(W, H, theme);
  if (showTitle) {
    s += text(40, 40, esc(opts.title || L(opts, '热力图 Heatmap', 'Heatmap')), theme, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(40, 58, esc(opts.subtitle), theme, { size: 12, color: t.muted });
  }

  // 行列标题
  colHeaders.forEach((c, j) => {
    const cx = r1(left + j * (cellW + gap) + cellW / 2);
    s += text(cx, plotTop - 12, trunc(c, 12), theme, { size: 9, color: t.muted, anchor: 'middle' });
  });
  rows.forEach((r, i) => {
    const cy = r1(plotTop + i * (cellH + gap) + cellH / 2 + 3);
    s += text(left - 12, cy, trunc(r.name, 16), theme, { size: 10, color: t.ink, anchor: 'end' });
  });

  // 单元格
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      const x = r1(left + j * (cellW + gap));
      const y = r1(plotTop + i * (cellH + gap));
      const v = grid[i][j];
      const isFocal = focalRC && focalRC[0] === i && focalRC[1] === j;
      const op = maxV > 0 ? Math.max(0.07, (v / maxV) * 0.65) : 0.07;
      const fill = isFocal ? t._rgba(t.accent, 0.85) : t._rgba(t.ink, op);
      const stroke = isFocal ? t.accent : 'none';
      s += rect(x, y, r1(cellW), r1(cellH), theme, { fill, stroke, sw: isFocal ? 1.2 : 0, rx: 1 });
      const cx = r1(x + cellW / 2), cy = r1(y + cellH / 2 + 3);
      s += text(cx, cy, fmt(v), theme, {
        size: 10,
        color: isFocal ? t.ink : t.ink,
        anchor: 'middle',
        weight: isFocal ? '600' : '400',
      });
    }
  }

  // 图例
  if (opts.legend !== 'none') {
    const ly = plotTop + plotH + 32;
    s += line(40, ly - 8, W - 40, ly - 8, theme, { color: t.rule, width: 0.8 });
    s += text(40, ly + 8, L(opts, '图例 LEGEND', 'LEGEND'), theme, { size: 8, color: t.muted });
    // 单色阶色带（8 档）
    const steps = 8;
    let bx = 120;
    for (let k = 0; k < steps; k++) {
      const op = 0.07 + (0.65 - 0.07) * (k / (steps - 1));
      s += rect(bx, ly - 4, 20, 12, theme, { fill: t._rgba(t.ink, op), stroke: 'none', rx: 0 });
      bx += 20;
    }
    s += text(116, ly + 7, L(opts, '低', 'LOW'), theme, { size: 8, color: t.muted, anchor: 'end' });
    s += text(bx + 4, ly + 7, L(opts, '高', 'HIGH'), theme, { size: 8, color: t.muted });
    if (focalRC) {
      s += rect(bx + 40, ly - 4, 20, 12, theme, { fill: t._rgba(t.accent, 0.85), stroke: t.accent, sw: 1, rx: 1 });
      const fl = `${rows[focalRC[0]].name} · ${colHeaders[focalRC[1]]}`;
      s += text(bx + 66, ly + 7, `${trunc(fl, 18)} · ${fmt(grid[focalRC[0]][focalRC[1]])}`, theme, { size: 9, color: t.muted });
    }
  }

  return s + svgClose();
}

// ===========================================================================
// DP 安全矩阵（权限矩阵）
// 输入同热力矩阵格式，单元格为权限记号 R/W/-/×（也支持 Read/Write/None/Deny 等）。
// 不同记号配不同底色，画图例。
// ===========================================================================
export function renderDpSecurityMatrix(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const mtx = parseMatrix(data);
  if (!mtx) return emptyChart(opts, theme);
  const { colHeaders, rows } = mtx;
  const nRoles = colHeaders.length;
  const nComp = rows.length;
  const isDark = theme && theme.id === 'dark';
  const red = isDark ? '#E0736B' : '#C0392B';

  // 记号 → 样式
  function markStyle(mark) {
    const u = String(mark || '').trim().toUpperCase();
    if (u === 'W' || u === 'WRITE' || u === '写' || u === '读写' || u === 'RW' || u === 'R/W')
      return { fill: t._rgba(t.accent, 0.12), stroke: t.accent, text: t.accent, label: 'W' };
    if (u === 'R' || u === 'READ' || u === '读' || u === 'RO')
      return { fill: t._rgba(t.muted, 0.12), stroke: t.ruleSolid, text: t.muted, label: 'R' };
    if (u === '-' || u === 'NONE' || u === '无' || u === '—' || u === 'NO' || u === '')
      return { fill: t.paper, stroke: t.ruleSolid, text: t.muted, label: '-' };
    if (u === '×' || u === 'X' || u === 'DENY' || u === '禁' || u === '禁止' || u === 'BLOCK')
      return { fill: t._rgba(red, 0.12), stroke: red, text: red, label: '×' };
    return { fill: t._rgba(t.muted, 0.08), stroke: t.ruleSolid, text: t.ink, label: String(mark || '-') };
  }

  // 几何（自适应列数/行数，必要时扩展画布）
  const leftPad = 16, compLabelW = 200, roleGap = 12, rightPad = 24;
  const headerH = 52, rowH = 36, rowStride = 40;
  const headerY = showTitleY(opts);
  const baseW = opts.w || 860;
  let roleColW = Math.max(40, Math.floor((baseW - leftPad - compLabelW - rightPad - (nRoles - 1) * roleGap) / Math.max(1, nRoles)));
  const compColX = leftPad;
  const roleColX = (j) => leftPad + compLabelW + roleGap + j * (roleColW + roleGap);
  const rowY = (k) => headerY + headerH + 12 + k * rowStride;
  const rowsBottom = rowY(nComp - 1) + rowH;
  const legendTop = rowsBottom + 24;
  const neededH = legendTop + 44;
  const neededW = roleColX(nRoles - 1) + roleColW + rightPad;
  const W = Math.max(baseW, neededW);
  const H = Math.max(opts.h || 520, neededH);

  let s = svgOpen(W, H, theme);
  if (opts.showTitle !== false) {
    s += text(leftPad, 40, esc(opts.title || L(opts, '权限矩阵 Access Matrix', 'Access Matrix')), theme, { size: 20, weight: '700' });
    if (opts.subtitle) s += text(leftPad, 58, esc(opts.subtitle), theme, { size: 12, color: t.muted });
  }

  // 表头：组件列标题 + 角色横幅
  s += rect(compColX, headerY, compLabelW, headerH, theme, { fill: t.paper, stroke: t.ruleSolid, sw: 0.8, rx: 6 });
  s += text(compColX + compLabelW / 2, headerY + 22, L(opts, '组件 Component', 'Component'), theme, { size: 11, color: t.ink, anchor: 'middle', weight: '600' });
  s += text(compColX + compLabelW / 2, headerY + 40, L(opts, 'vs 角色 vs role', 'vs role'), theme, { size: 9, color: t.muted, anchor: 'middle' });
  colHeaders.forEach((c, j) => {
    const x = roleColX(j);
    s += rect(x, headerY, roleColW, headerH, theme, { fill: t.ink, rx: 6 });
    s += text(r1(x + roleColW / 2), headerY + 32, trunc(c, Math.round(roleColW / 8)), theme, { size: 11, color: t.paper, anchor: 'middle', weight: '600' });
  });

  // 数据行
  rows.forEach((r, i) => {
    const y = rowY(i);
    s += rect(compColX, y, compLabelW, rowH, theme, { fill: t.paper, stroke: t.ruleSolid, sw: 0.8, rx: 4 });
    s += text(compColX + 12, y + 23, trunc(r.name, Math.round(compLabelW / 8)), theme, { size: 11, color: t.ink, weight: '600' });
    for (let j = 0; j < nRoles; j++) {
      const x = roleColX(j);
      const mk = r.vals[j] || '-';
      const st = markStyle(mk);
      s += rect(x, y, roleColW, rowH, theme, { fill: st.fill, stroke: st.stroke, sw: 0.6, rx: 4 });
      s += text(r1(x + roleColW / 2), y + 23, st.label, theme, { size: 12, color: st.text, anchor: 'middle', weight: '600' });
    }
  });

  // 图例
  if (opts.legend !== 'none') {
    s += line(leftPad, legendTop, W - rightPad, legendTop, theme, { color: t.ruleSolid, width: 0.8 });
    s += text(leftPad, legendTop + 22, L(opts, '图例 LEGEND', 'LEGEND'), theme, { size: 8, color: t.muted });
    const items = [
      { fill: t._rgba(t.accent, 0.12), stroke: t.accent, label: L(opts, '可写 W', 'Write W') },
      { fill: t._rgba(t.muted, 0.12), stroke: t.ruleSolid, label: L(opts, '只读 R', 'Read R') },
      { fill: t.paper, stroke: t.ruleSolid, label: L(opts, '无权限 -', 'None -') },
      { fill: t._rgba(red, 0.12), stroke: red, label: L(opts, '禁止 ×', 'Deny ×') },
    ];
    s += legendRow(items, leftPad + 90, legendTop + 22, theme, t);
  }

  return s + svgClose();
}

// ---- 内部辅助 --------------------------------------------------------------

/** 根据标题显隐返回表头起始 y。 */
function showTitleY(opts) {
  return opts && opts.showTitle === false ? 44 : 72;
}

/** 简单 nice scale（避免依赖外部导出不一致）。 */
function niceAuto(min, max, maxTicks = 5) {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    min -= 1; max += 1;
  }
  const range = niceNum(Math.max(Math.abs(max - min), 1), false);
  const step = niceNum(range / Math.max(1, maxTicks - 1), true);
  const nMin = Math.floor(min / step) * step;
  const nMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = nMin; v <= nMax + step * 0.5; v += step) ticks.push(+v.toFixed(10));
  return { min: nMin, max: nMax, step, ticks };
}

function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range || 1));
  const frac = range / Math.pow(10, exp);
  let nice;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exp);
}

/**
 * Squarified treemap 布局（Bruls et al., 2000）。
 * 返回 [{name,value,area,x,y,w,h}]，面积之和 = W*H。
 */
function squarify(items, X, Y, W, H) {
  const totalVal = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (totalVal <= 0 || W <= 0 || H <= 0) return items.map((i) => ({ ...i, area: 0, x: X, y: Y, w: 0, h: 0 }));
  const area = W * H;
  let kids = items.map((i) => ({ ...i, area: (Math.max(0, i.value) / totalVal) * area }));
  kids.sort((a, b) => b.area - a.area);
  const out = [];
  let x = X, y = Y, w = W, h = H;

  const worst = (row, side) => {
    let s = 0, mx = 0, mn = Infinity;
    for (const r of row) {
      s += r.area;
      if (r.area > mx) mx = r.area;
      if (r.area < mn) mn = r.area;
    }
    if (s <= 0 || side <= 0) return Infinity;
    const side2 = side * side;
    return Math.max((side2 * mx) / (s * s), (s * s) / (side2 * mn));
  };

  const placeRow = (row) => {
    const s = row.reduce((a, r) => a + r.area, 0);
    if (h <= w) {
      const thickness = s / h;
      let cy = y;
      for (const r of row) {
        const rh = r.area / thickness;
        out.push({ ...r, x, y: cy, w: thickness, h: rh });
        cy += rh;
      }
      x += thickness; w -= thickness;
    } else {
      const thickness = s / w;
      let cx = x;
      for (const r of row) {
        const rw = r.area / thickness;
        out.push({ ...r, x: cx, y, w: rw, h: thickness });
        cx += rw;
      }
      y += thickness; h -= thickness;
    }
  };

  let row = [];
  let idx = 0;
  while (idx < kids.length) {
    const side = Math.min(w, h);
    const c = kids[idx];
    const withC = row.concat([c]);
    if (row.length === 0 || worst(row, side) >= worst(withC, side)) {
      row = withC;
      idx++;
    } else {
      placeRow(row);
      row = [];
    }
  }
  if (row.length) placeRow(row);
  return out;
}
