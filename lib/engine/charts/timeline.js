// ===========================================================================
// timeline.js — Timeline（时间轴） & Gantt（甘特图）编辑级渲染器
// 设计铁律（继承 diagram-design）：
//   · 无阴影  · 发丝线(stroke 1)  · 4px 栅格  · 克制强调色(accent 仅用于焦点)
//   · 时间坐标诚实映射（用 scale / niceScale，不均等间隔按真实时间非均匀排布）
// 视觉对齐：/tmp/diagram-design/skills/diagram-design/{references,assets}/type-{timeline,gantt}.*
// ===========================================================================
import { svgOpen, svgClose, text, line, rect, circle, path, scale, niceScale } from '../base.js';
import { expandTheme } from '../diagrams/shapes.js';

const GRID = 4;
const snap = (v) => Math.round(v / GRID) * GRID;
const num = (v, d = 2) => { const n = Number(v); return Number.isFinite(n) ? +n.toFixed(d) : 0; };

// ---- 数据解析 -------------------------------------------------------------
// 把一行按逗号切成至多 limit 段（保留名称里的逗号）。
function splitRow(l, limit) {
  const res = []; let cur = ''; let count = 0;
  for (let i = 0; i < l.length; i++) {
    if (l[i] === ',' && count < limit - 1) { res.push(cur); cur = ''; count++; }
    else cur += l[i];
  }
  res.push(cur);
  return res;
}

function parseCsv(text, limit) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
  if (!lines.length) return { header: null, rows: [] };
  const knownH = /^(date|日期|time|时间|task|任务|start|开始|end|结束)$/i;
  const first = splitRow(lines[0], limit);
  let startIdx = 0; let header = null;
  if (first.length >= 2 && knownH.test(first[0].trim()) && knownH.test(first[1].trim())) {
    header = first; startIdx = 1;
  }
  const rows = lines.slice(startIdx)
    .map((l) => splitRow(l, limit))
    .filter((p) => p.some((x) => x.trim()));
  return { header, rows };
}

// 判断整列是纯数字（周/数值模式）还是日期模式。
function detectMode(values) {
  const all = values.filter((v) => String(v).trim().length);
  if (!all.length) return 'num';
  return all.every((v) => /^-?\d+(\.\d+)?$/.test(String(v).trim())) ? 'num' : 'date';
}

// 解析单个值为连续数值（用于比例尺）。
function parseValue(str, mode) {
  const s = String(str || '').trim();
  if (!s) return 0;
  if (mode === 'num') { const n = Number(s); return Number.isFinite(n) ? n : 0; }
  let d = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s + 'T00:00:00');
  else if (/^\d{4}-\d{2}$/.test(s)) d = new Date(s + '-01T00:00:00');
  else if (/^\d{4}$/.test(s)) d = new Date(s + '-01-01T00:00:00');
  else { const t = Date.parse(s); if (!Number.isNaN(t)) d = new Date(t); }
  if (d && !Number.isNaN(d.getTime())) return d.getTime();
  const t2 = Date.parse(s);
  return Number.isNaN(t2) ? 0 : t2;
}

// 日期模式下生成坐标轴刻度（年 / 季），诚实反映时间边界。
function dateTicks(minV, maxV) {
  const ticks = [];
  const start = new Date(minV), end = new Date(maxV);
  const spanYears = end.getFullYear() - start.getFullYear();
  for (let y = start.getFullYear(); y <= end.getFullYear() + 1; y++) {
    const t = new Date(y, 0, 1).getTime();
    if (t >= minV - 1 && t <= maxV + 1) ticks.push({ t, label: String(y), sub: false });
  }
  if (spanYears <= 2) {
    const months = [3, 6, 9]; const mon = ['Apr', 'Jul', 'Oct'];
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      months.forEach((m, k) => {
        if (y === start.getFullYear() && m < start.getMonth()) return;
        if (y === end.getFullYear() && m > end.getMonth()) return;
        const t = new Date(y, m, 1).getTime();
        ticks.push({ t, label: `${mon[k]} '${String(y).slice(2)}`, sub: true });
      });
    }
  }
  ticks.sort((a, b) => a.t - b.t);
  return ticks;
}

function dotDefs(idp, t) {
  return `<defs><pattern id="${idp}-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="${t._rgba(t.ink, 0.10)}"/></pattern></defs>`;
}

// ===========================================================================
// renderTimeline — 输入 CSV：日期,事件
//   例： 日期,事件
//        2024-01,立项
//        2024-06,上线
//        2024-12,复盘
// 事件名加 "*" 或 "!" 前缀 → 重大里程碑（accent 强调）。
// opts.vertical → 竖直时间轴。
// ===========================================================================
export function renderTimeline(data, theme, opts = {}) {
  const t = expandTheme(theme || {});
  const W = snap(opts.w || 860);
  const showTitle = opts.showTitle !== false;
  const vertical = !!opts.vertical;
  let H = snap(opts.h || 520);
  const lang = opts.lang === 'en' ? 'en' : 'zh';

  let s = svgOpen(W, H, theme);
  s += `<rect width="100%" height="100%" fill="${t.paper}"/>`;
  s += dotDefs('tl', t);
  s += `<rect width="100%" height="100%" fill="url(#tl-dots)" opacity="0.5"/>`;
  if (showTitle && opts.title) s += text(60, 40, opts.title, theme, { size: 20, weight: '700', color: t.ink });
  if (showTitle && opts.subtitle) s += text(60, 58, opts.subtitle, theme, { size: 12, color: t.muted });

  const { rows } = parseCsv(data, 2);
  const events = rows.map((r) => {
    const raw = (r[0] || '').trim();
    let name = (r[1] || '').trim();
    const focal = /^[*!]/.test(name);
    name = name.replace(/^[*!]\s*/, '');
    return { raw, name, focal };
  }).filter((e) => e.raw && e.name);

  if (!events.length) {
    s += text(W / 2, H / 2, lang === 'en' ? 'No data' : '无数据', theme, { size: 14, color: t.muted, anchor: 'middle' });
    return s + svgClose();
  }

  const mode = detectMode(events.map((e) => e.raw));
  const vals = events.map((e) => parseValue(e.raw, mode));
  let dmin = Math.min(...vals), dmax = Math.max(...vals);
  if (dmin === dmax) { dmin -= 1; dmax += 1; }
  const pad = (dmax - dmin) * 0.06 || 1;
  const domMin = dmin - pad, domMax = dmax + pad;

  const xLeft = 70, xRight = W - 70, yTop = 92, yBottom = H - 72;
  const baselineY = Math.round((yTop + yBottom) / 2);
  const baselineX = Math.round((xLeft + xRight) / 2);
  const dropH = 52;

  if (!vertical) {
    const sx = scale(domMin, domMax, xLeft, xRight);
    s += line(xLeft, baselineY, xRight, baselineY, theme, { color: t.ruleSolid, width: 1 });
    s += line(xLeft, baselineY - 8, xLeft, baselineY + 8, theme, { color: t.ruleSolid, width: 1 });
    s += line(xRight, baselineY - 8, xRight, baselineY + 8, theme, { color: t.ruleSolid, width: 1 });
    if (mode === 'date') {
      dateTicks(domMin, domMax).forEach((tk) => {
        const x = sx(tk.t);
        if (x < xLeft - 1 || x > xRight + 1) return;
        s += line(x, baselineY - 6, x, baselineY + 6, theme, { color: t._rgba(t.ink, 0.18), width: 1 });
        s += text(x, baselineY + 22, tk.label, theme, { size: 8, color: t.muted, anchor: 'middle' });
      });
    }
    events.forEach((e, i) => {
      const x = sx(vals[i]);
      const above = i % 2 === 0;
      const ly = above ? baselineY - dropH : baselineY + dropH;
      s += line(x, baselineY, x, ly, theme, { color: e.focal ? t.accent : t._rgba(t.ink, 0.30), width: 1 });
      s += circle(x, baselineY, e.focal ? 6 : 4, e.focal ? t.accent : t.ink);
      if (above) {
        s += text(x, ly - 14, e.raw, theme, { size: 9, color: e.focal ? t.accent : t.muted, anchor: 'middle' });
        s += text(x, ly - 2, e.name, theme, { size: e.focal ? 14 : 12, weight: '600', color: t.ink, anchor: 'middle' });
      } else {
        s += text(x, ly + 14, e.raw, theme, { size: 9, color: e.focal ? t.accent : t.muted, anchor: 'middle' });
        s += text(x, ly + 28, e.name, theme, { size: e.focal ? 14 : 12, weight: '600', color: t.ink, anchor: 'middle' });
      }
    });
  } else {
    const sy = scale(domMin, domMax, yTop, yBottom);
    s += line(baselineX, yTop, baselineX, yBottom, theme, { color: t.ruleSolid, width: 1 });
    s += line(baselineX - 8, yTop, baselineX + 8, yTop, theme, { color: t.ruleSolid, width: 1 });
    s += line(baselineX - 8, yBottom, baselineX + 8, yBottom, theme, { color: t.ruleSolid, width: 1 });
    if (mode === 'date') {
      dateTicks(domMin, domMax).forEach((tk) => {
        const y = sy(tk.t);
        if (y < yTop - 1 || y > yBottom + 1) return;
        s += line(baselineX - 6, y, baselineX + 6, y, theme, { color: t._rgba(t.ink, 0.18), width: 1 });
        s += text(baselineX + 12, y + 3, tk.label, theme, { size: 8, color: t.muted, anchor: 'start' });
      });
    }
    events.forEach((e, i) => {
      const y = sy(vals[i]);
      const left = i % 2 === 0;
      const lx = left ? baselineX - dropH : baselineX + dropH;
      s += line(baselineX, y, lx, y, theme, { color: e.focal ? t.accent : t._rgba(t.ink, 0.30), width: 1 });
      s += circle(baselineX, y, e.focal ? 6 : 4, e.focal ? t.accent : t.ink);
      if (left) {
        s += text(lx - 8, y - 6, e.raw, theme, { size: 9, color: e.focal ? t.accent : t.muted, anchor: 'end' });
        s += text(lx - 8, y + 8, e.name, theme, { size: e.focal ? 14 : 12, weight: '600', color: t.ink, anchor: 'end' });
      } else {
        s += text(lx + 8, y - 6, e.raw, theme, { size: 9, color: e.focal ? t.accent : t.muted, anchor: 'start' });
        s += text(lx + 8, y + 8, e.name, theme, { size: e.focal ? 14 : 12, weight: '600', color: t.ink, anchor: 'start' });
      }
    });
  }

  // 图例
  const lgY = H - 26;
  s += line(60, lgY - 14, W - 60, lgY - 14, theme, { color: t.rule, width: 0.8 });
  s += text(60, lgY, 'LEGEND', theme, { size: 8, color: t.muted });
  s += circle(72, lgY - 4, 4, t.ink);
  s += text(84, lgY, lang === 'en' ? 'Event' : '事件', theme, { size: 8.5, color: t.muted });
  s += circle(160, lgY - 4, 6, t.accent);
  s += text(172, lgY, lang === 'en' ? 'Major milestone' : '重大里程碑', theme, { size: 8.5, color: t.muted });
  return s + svgClose();
}

// ===========================================================================
// renderGantt — 输入 CSV：任务,开始,结束[,阶段(可选)]
//   例： 任务,开始,结束
//        需求,0,3
//        开发,3,9
//        测试,9,12
// 开始/结束可为数字（周）或 YYYY-MM-DD 日期。
// 任务名加 "*"/"!" → 焦点任务（accent）。开始==结束 → 里程碑（菱形）。
// 第 4 列「阶段」→ 分组泳道带（可选）。
// opts.today → 画「今天」虚线（数字或日期）。
// ===========================================================================
export function renderGantt(data, theme, opts = {}) {
  const t = expandTheme(theme || {});
  const W = snap(opts.w || 860);
  const showTitle = opts.showTitle !== false;
  const lang = opts.lang === 'en' ? 'en' : 'zh';

  const { rows } = parseCsv(data, 4);
  const tasks = rows.map((r) => {
    let name = (r[0] || '').trim();
    const focal = /^[*!]/.test(name);
    name = name.replace(/^[*!]\s*/, '');
    const startRaw = (r[1] || '0').trim();
    const endRaw = (r[2] || '0').trim();
    const phase = (r[3] || '').trim();
    return { name, startRaw, endRaw, phase, focal };
  }).filter((x) => x.name);

  if (!tasks.length) {
    let s0 = svgOpen(W, 200, theme);
    s0 += `<rect width="100%" height="100%" fill="${t.paper}"/>`;
    s0 += text(W / 2, 100, lang === 'en' ? 'No data' : '无数据', theme, { size: 14, color: t.muted, anchor: 'middle' });
    return s0 + svgClose();
  }

  const allRaw = tasks.flatMap((x) => [x.startRaw, x.endRaw]);
  const mode = detectMode(allRaw);
  const starts = tasks.map((x) => parseValue(x.startRaw, mode));
  const endsRaw = tasks.map((x) => parseValue(x.endRaw, mode));
  let dmin = Math.min(...starts), dmax = Math.max(...endsRaw);
  if (dmin === dmax) { dmin -= 1; dmax += 1; }
  const pad = (dmax - dmin) * 0.04 || 1;
  const domMin = dmin - pad, domMax = dmax + pad;

  // 布局
  const labelW = Math.min(200, Math.round(W * 0.26));
  const TL = 20 + labelW;
  const timelineW = (W - 40) - TL;
  const titleH = showTitle ? 48 : 20;
  const axisLineY = titleH + 16;
  const firstRowY = axisLineY + 20;
  const rowH = 40, barH = 24, barPad = 8;
  const needsH = firstRowY + tasks.length * rowH + 80;
  const H = snap(Math.max(opts.h || 520, needsH));
  const bottomY = firstRowY + tasks.length * rowH;
  const sx = scale(domMin, domMax, TL, TL + timelineW);

  let s = svgOpen(W, H, theme);
  s += `<rect width="100%" height="100%" fill="${t.paper}"/>`;
  s += dotDefs('gt', t);
  s += `<rect width="100%" height="100%" fill="url(#gt-dots)" opacity="0.5"/>`;
  if (showTitle && opts.title) s += text(20, 36, opts.title, theme, { size: 20, weight: '700', color: t.ink });
  if (showTitle && opts.subtitle) s += text(20, titleH - 4, opts.subtitle, theme, { size: 12, color: t.muted });

  // 阶段分组带（连续相同 phase）
  const groups = [];
  tasks.forEach((tk, i) => {
    if (!tk.phase) return;
    const last = groups[groups.length - 1];
    if (last && last.phase === tk.phase) last.end = i;
    else groups.push({ phase: tk.phase, start: i, end: i });
  });
  groups.forEach((g) => {
    const gy = firstRowY + g.start * rowH - 12;
    const gh = (g.end - g.start + 1) * rowH + 24;
    s += rect(12, gy, W - 24, gh, theme, { fill: t._rgba(t.ink, 0.02), stroke: t._rgba(t.ink, 0.10), sw: 0.8, rx: 6 });
    s += text(20, gy + 12, g.phase, theme, { size: 7, color: t._rgba(t.ink, 0.40) });
  });

  // 时间轴刻度
  s += line(TL, axisLineY, TL + timelineW, axisLineY, theme, { color: t.ruleSolid, width: 0.8 });
  if (mode === 'num') {
    const ns = niceScale(domMin, domMax, Math.max(4, Math.round(timelineW / 90)));
    ns.ticks.forEach((v) => {
      const x = sx(v);
      if (x < TL - 1 || x > TL + timelineW + 1) return;
      s += line(x, axisLineY, x, bottomY, theme, { color: t._rgba(t.ink, 0.05), width: 0.6 });
      s += text(x, axisLineY - 6, Number.isInteger(v) ? String(v) : v.toFixed(1), theme, { size: 8, color: t.muted, anchor: 'middle' });
    });
  } else {
    dateTicks(domMin, domMax).forEach((tk) => {
      const x = sx(tk.t);
      if (x < TL - 1 || x > TL + timelineW + 1) return;
      s += line(x, axisLineY, x, bottomY, theme, { color: t._rgba(t.ink, 0.05), width: 0.6 });
      s += text(x, axisLineY - 6, tk.label, theme, { size: 8, color: tk.sub ? t.muted : t.ink, anchor: 'middle' });
    });
  }
  // 左侧分隔线
  s += line(TL, axisLineY - 16, TL, bottomY, theme, { color: t.ruleSolid, width: 0.8 });

  // 任务行
  tasks.forEach((tk, i) => {
    const rowY = firstRowY + i * rowH;
    const barY = rowY + barPad;
    const x1 = sx(parseValue(tk.startRaw, mode));
    const x2 = sx(parseValue(tk.endRaw, mode));
    const isMilestone = num(x2 - x1, 2) <= 0.0001;
    const labelCol = tk.focal ? t.accent : t.ink;
    // 左侧任务名
    s += text(20, barY + barH - 8, tk.name, theme, { size: 11, weight: '600', color: labelCol });
    if (isMilestone) {
      // 里程碑：菱形 + accent
      const cx = x1, cy = barY + barH / 2, r = 8;
      s += path(`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`,
        { stroke: t.accent, fill: t.accentTint, sw: 1 });
    } else {
      const bw = Math.max(2, num(x2 - x1, 2));
      const fill = tk.focal ? t.accentTint : t._rgba(t.muted, 0.15);
      const stroke = tk.focal ? t.accent : t.muted;
      s += rect(num(x1, 2), barY, bw, barH, theme, { fill, stroke, sw: 1, rx: 4 });
      if (tk.focal) s += text(num(x1 + bw / 2, 2), barY + barH - 8, 'GATE', theme, { size: 9, color: t.accent, anchor: 'middle' });
    }
  });

  // 今天标记
  if (opts.today != null && String(opts.today).trim() !== '') {
    const tv = parseValue(String(opts.today), mode);
    if (tv >= domMin && tv <= domMax) {
      const x = sx(tv);
      s += line(x, axisLineY, x, bottomY, theme, { color: t.muted, width: 1, dash: '4,3' });
      s += text(x, bottomY + 14, lang === 'en' ? 'today' : '今天', theme, { size: 8, color: t.muted, anchor: 'middle' });
    }
  }

  // 图例
  const lgY = H - 22;
  s += line(20, lgY - 14, W - 20, lgY - 14, theme, { color: t.rule, width: 0.8 });
  s += text(20, lgY, 'LEGEND', theme, { size: 8, color: t.muted });
  s += rect(40, lgY - 11, 20, 12, theme, { fill: t.accentTint, stroke: t.accent, sw: 1, rx: 3 });
  s += text(68, lgY, lang === 'en' ? 'Focal / gate' : '焦点 / 关卡', theme, { size: 8.5, color: t.muted });
  s += rect(168, lgY - 11, 20, 12, theme, { fill: t._rgba(t.muted, 0.15), stroke: t.muted, sw: 1, rx: 3 });
  s += text(196, lgY, lang === 'en' ? 'Task' : '任务', theme, { size: 8.5, color: t.muted });
  s += path(`M 296 ${lgY - 5} L 304 ${lgY - 11} L 312 ${lgY - 5} L 304 ${lgY + 1} Z`, { stroke: t.accent, fill: t.accentTint, sw: 1 });
  s += text(320, lgY, lang === 'en' ? 'Milestone' : '里程碑', theme, { size: 8.5, color: t.muted });
  return s + svgClose();
}
