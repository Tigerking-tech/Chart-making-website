// ===========================================================================
// experience.js — 编辑级"体验/过程"类图型（继承 diagram-design 设计铁律）
//   · 无阴影  · 发丝线(stroke 1)  · 4px 栅格  · 克制强调色
//   · 本质是"分列/分行的卡片或带"，用 rect + text 拼图，发丝线分隔、留白克制
//   · 全部返回自包含 SVG 字符串
// 图型：
//   renderKanban          看板（状态普查，无连线）
//   renderUserJourney     用户旅程（阶段 × 行为/想法/情绪 + 情绪曲线）
//   renderServiceBlueprint 服务蓝图（阶段 × 层，含可见性线）
//   renderStoryMap        故事地图（叙事主轴 backbone + 发布切片）
// ===========================================================================
import { svgOpen, svgClose, line, circle, esc } from '../base.js';
import { expandTheme } from '../diagrams/shapes.js';

// ---------------------------------------------------------------------------
// 通用：文本（支持等宽/字距/大写），rect（支持虚线发丝线）
// ---------------------------------------------------------------------------
function mkText(t) {
  return (x, y, str, o = {}) => {
    const size = o.size ?? 12;
    const color = o.color ?? t.ink;
    const anchor = o.anchor ?? 'start';
    const weight = o.weight ?? 'normal';
    const ff = o.mono ? ' font-family="\'SFMono-Regular\',ui-monospace,Menlo,monospace"' : '';
    const tr = o.track ? ` letter-spacing="${o.track}"` : '';
    const up = o.upper ? ' style="text-transform:uppercase"' : '';
    return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}"${ff}${tr}${up}>${esc(str)}</text>`;
  };
}
function mkRect(t) {
  return (x, y, w, h, o = {}) => {
    const fill = o.fill ?? 'none';
    const stroke = o.stroke ?? 'none';
    const sw = o.sw ?? 1;
    const rx = o.rx ?? 0;
    const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
    const op = o.opacity != null ? ` opacity="${o.opacity}"` : '';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}${op}/>`;
  };
}

// ---------------------------------------------------------------------------
// 通用：解析结构化 DSL
//   每行 "<key>: <arg1> | <arg2> | ..."；# 开头或空行忽略。
// ---------------------------------------------------------------------------
function parseBlock(data) {
  const out = [];
  String(data || '').split(/\r?\n/).forEach((raw) => {
    const line0 = raw.replace(/#.*$/, '').trim();
    if (!line0) return;
    const ci = line0.indexOf(':');
    if (ci < 0) return;
    const key = line0.slice(0, ci).trim().toLowerCase();
    const rest = line0.slice(ci + 1).trim();
    const args = rest.split('|').map((s) => s.trim());
    out.push({ key, args });
  });
  return out;
}

// 让坐标贴 4px 栅格
const snap = (v) => Math.round(v / 4) * 4;

// ===========================================================================
// 1. 看板 Kanban
//    DSL:
//      col: 待办
//      col: 进行中 | 3              # 后接 WIP 上限
//      card: 待办 | 任务A | AVA-201·priya | default
//      card: 进行中 | 任务B | AVA-118·sam | blocked
//    card 状态 state ∈ default|blocked|waiting|done（缺省 default）
// ===========================================================================
export function renderKanban(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const W = opts.w || 860;
  const baseH = opts.h || 520;
  const T = mkText(t);
  const R = mkRect(t);

  const lines = parseBlock(data);
  const cols = [];
  const byName = {};
  lines.forEach((L) => {
    if (L.key === 'col') {
      const name = L.args[0] || '列';
      let limit = null;
      if (L.args[1] !== undefined && L.args[1] !== '' && !Number.isNaN(Number(L.args[1]))) limit = Number(L.args[1]);
      const c = { name, limit, cards: [] };
      cols.push(c); byName[name] = c;
    } else if (L.key === 'card') {
      const colName = L.args[0] || '';
      const title = L.args[1] || '';
      const sub = L.args[2] || '';
      const state = (L.args[3] || 'default').toLowerCase();
      const c = byName[colName] || cols[cols.length - 1];
      if (c) c.cards.push({ title, sub, state });
    }
  });
  if (!cols.length) cols.push({ name: opts.lang === 'en' ? 'To Do' : '待办', limit: null, cards: [] });
  const n = Math.min(5, cols.length);

  const top = opts.title ? 40 : 8;
  const mL = 32, mR = 32, gut = 32;
  const colW = Math.max(120, snap((W - mL - mR - gut * (n - 1)) / n));
  const totalW = colW * n + gut * (n - 1);
  const startX = Math.round((W - totalW) / 2);

  const colBgY = top + 12;
  const headerY = colBgY + 16;
  const ruleY = colBgY + 32;
  const cardStartY = ruleY + 16;
  const cardH = 56, cardGap = 12;
  const maxStack = Math.max(1, ...cols.map((c) => c.cards.length));
  const cardsBottom = cardStartY + maxStack * cardH + (maxStack - 1) * cardGap;
  const colBgH = cardsBottom - colBgY + 12;

  const legY = cardsBottom + 24;
  const needH = legY + 44;
  const H = Math.ceil(Math.max(baseH, needH) / 4) * 4;

  let s = svgOpen(W, H, theme);
  if (opts.title) s += T(32, 28, opts.title, { size: 18, weight: '700', color: t.ink });

  // 列背景
  for (let i = 0; i < n; i++) {
    const x = startX + i * (colW + gut);
    s += R(x, colBgY, colW, colBgH, { fill: t._rgba(t.ink, 0.02), rx: 8 });
  }
  // 列头 + WIP 芯片 + 表头发丝线
  for (let i = 0; i < n; i++) {
    const c = cols[i];
    const x = startX + i * (colW + gut);
    s += T(x + 16, headerY, c.name, { size: 12, weight: '600', color: t.ink });
    const nCards = c.cards.length;
    let label, over = false;
    if (c.limit != null) { label = `${nCards}/${c.limit}`; over = nCards > c.limit; }
    else label = `${nCards}`;
    const chipW = Math.max(28, label.length * 7 + 12);
    const chipH = 16;
    const chipX = x + colW - 16 - chipW;
    const chipY = headerY - 13;
    s += R(chipX, chipY, chipW, chipH, { fill: 'transparent', stroke: over ? t.accent : t._rgba(t.ink, 0.40), sw: 0.8, rx: 2 });
    s += T(chipX + chipW / 2, chipY + 11, label, { size: 8, mono: true, anchor: 'middle', color: over ? t.accent : t._rgba(t.ink, 0.8) });
    s += line(x, ruleY, x + colW, ruleY, t, { color: t.rule, width: 1 });
  }
  // 卡片
  for (let i = 0; i < n; i++) {
    const c = cols[i];
    const x = startX + i * (colW + gut);
    c.cards.forEach((card, j) => {
      const cy = cardStartY + j * (cardH + cardGap);
      const cx = x + 8;
      const cw = colW - 16;
      let fill = t.paper, stroke = t.ink, dash = null, bar = false;
      if (card.state === 'blocked') { fill = t.accentTint; stroke = t.accent; dash = '4,4'; bar = true; }
      else if (card.state === 'waiting' || card.state === 'external') { fill = t._rgba(t.ink, 0.02); stroke = t._rgba(t.ink, 0.20); dash = '4,3'; }
      else if (card.state === 'done') { fill = t._rgba(t.ink, 0.05); stroke = t.muted; }
      s += R(cx, cy, cw, cardH, { fill, stroke, sw: 1, rx: 6, dash });
      if (bar) s += R(cx, cy, 4, cardH, { fill: t.accent });
      const tx = cx + (bar ? 14 : 12);
      s += T(tx, cy + 22, card.title, { size: 12, weight: '600', color: t.ink });
      if (card.sub) s += T(tx, cy + 38, card.sub, { size: 9, mono: true, color: t.muted });
    });
  }
  // 图例
  s += line(startX, legY, startX + totalW, legY, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += T(startX, legY + 16, opts.lang === 'en' ? 'LEGEND' : '图例', { size: 8, mono: true, color: t.muted, track: '0.18em', upper: opts.lang === 'en' });
  const legItems = [
    { label: opts.lang === 'en' ? 'Default' : '默认', fill: t.paper, stroke: t.ink, dash: null },
    { label: opts.lang === 'en' ? 'Blocked' : '阻塞', fill: t.accentTint, stroke: t.accent, dash: '4,4' },
    { label: opts.lang === 'en' ? 'Waiting / external' : '等待/外部', fill: t._rgba(t.ink, 0.02), stroke: t._rgba(t.ink, 0.20), dash: '4,3' },
    { label: opts.lang === 'en' ? 'Done' : '完成', fill: t._rgba(t.ink, 0.05), stroke: t.muted, dash: null },
  ];
  let lx = startX;
  legItems.forEach((it) => {
    s += R(lx, legY + 12, 16, 8, { fill: it.fill, stroke: it.stroke, sw: 1, rx: 2, dash: it.dash });
    s += T(lx + 24, legY + 19, it.label, { size: 8.5, color: t.muted });
    lx += 24 + it.label.length * 7 + 24;
  });
  s += svgClose();
  return s;
}

// ===========================================================================
// 2. 用户旅程 User journey
//    DSL:
//      stage: 浏览
//      do: 浏览 | 搜索商品            # 行为 ACTIONS
//      think: 浏览 | 这个便宜吗        # 想法 THOUGHTS
//      touch: 浏览 | 搜索框            # 触点 TOUCHPOINTS
//      feel: 浏览 | neutral           # 情绪：high|med-high|neutral|med-low|low
//      pain: 浏览 | 没有筛选           # 痛点标记（accent）
//    情绪曲线是本图负载元素；低谷(trough)及入射段用 accent。
// ===========================================================================
export function renderUserJourney(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const W = opts.w || 860;
  const baseH = opts.h || 520;
  const T = mkText(t);
  const R = mkRect(t);

  const lines = parseBlock(data);
  const stages = [];
  const rows = {};
  const pains = [];
  lines.forEach((L) => {
    if (L.key === 'stage') stages.push(L.args[0] || ('阶段' + (stages.length + 1)));
    else if (L.key === 'do') (rows.do = rows.do || {})[L.args[0]] = L.args[1] || '';
    else if (L.key === 'think') (rows.think = rows.think || {})[L.args[0]] = L.args[1] || '';
    else if (L.key === 'touch') (rows.touch = rows.touch || {})[L.args[0]] = L.args[1] || '';
    else if (L.key === 'feel') (rows.feel = rows.feel || {})[L.args[0]] = L.args[1] || 'neutral';
    else if (L.key === 'pain') pains.push({ stage: L.args[0], text: L.args[1] || '' });
  });
  if (!stages.length) stages.push(...(opts.lang === 'en' ? ['Stage 1', 'Stage 2', 'Stage 3'] : ['阶段1', '阶段2', '阶段3']));
  const n = Math.min(6, stages.length);

  const top = opts.title ? 40 : 8;
  const mL = 64, mR = 24;
  const slot = (W - mL - mR) / n;
  const cx = (i) => mL + slot * (i + 0.5);

  const eyebrowY = top + 22, nameY = top + 42;
  const bandTop = top + 62, bandH = 160, bandBottom = bandTop + bandH;

  const rowTypes = [];
  if (rows.do) rowTypes.push('do');
  if (rows.think) rowTypes.push('think');
  if (rows.touch) rowTypes.push('touch');
  const rowH = 56;
  const rowTop = bandBottom + 28;
  const labelEn = { do: 'ACTIONS', think: 'THOUGHTS', touch: 'TOUCHPOINTS' };
  const labelZh = { do: '行为', think: '想法', touch: '触点' };

  const order = ['low', 'med-low', 'neutral', 'med-high', 'high'];
  const fracOf = (v) => {
    const k = String(v || '').toLowerCase();
    if (k.includes('high') && k.includes('med')) return 3 / 4;
    if (k.includes('low') && k.includes('med')) return 1 / 4;
    if (k.startsWith('high') || k === '高') return 1;
    if (k.startsWith('low') || k === '低') return 0;
    return 0.5;
  };
  const feelByStage = {};
  stages.forEach((st, i) => { if (rows.feel && rows.feel[st] != null) feelByStage[i] = fracOf(rows.feel[st]); });
  let trough = -1, minF = Infinity;
  Object.keys(feelByStage).forEach((i) => { const f = feelByStage[i]; if (f < minF) { minF = f; trough = +i; } });

  const rowsBottom = rowTop + rowTypes.length * rowH;
  const legY = rowsBottom + 24;
  const needH = legY + 44;
  const H = Math.ceil(Math.max(baseH, needH) / 4) * 4;

  let s = svgOpen(W, H, theme);
  if (opts.title) s += T(32, 28, opts.title, { size: 18, weight: '700', color: t.ink });

  // 阶段表头
  for (let i = 0; i < n; i++) {
    s += T(cx(i), eyebrowY, (opts.lang === 'en' ? 'STAGE ' : '阶段 ') + (i + 1), { size: 8, mono: true, anchor: 'middle', color: t.muted, track: '0.14em', upper: opts.lang === 'en' });
    s += T(cx(i), nameY, stages[i], { size: 12, weight: '600', anchor: 'middle', color: t.ink });
  }
  // 情绪带参考发丝线
  s += line(mL, bandTop, W - mR, bandTop, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += line(mL, bandTop + bandH / 2, W - mR, bandTop + bandH / 2, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += line(mL, bandBottom, W - mR, bandBottom, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += T(56, bandTop + 4, 'HIGH', { size: 8, mono: true, anchor: 'end', color: t.muted, track: '0.1em' });
  s += T(56, bandTop + bandH / 2 + 4, 'NEUTRAL', { size: 8, mono: true, anchor: 'end', color: t.muted, track: '0.1em' });
  s += T(56, bandBottom + 4, 'LOW', { size: 8, mono: true, anchor: 'end', color: t.muted, track: '0.1em' });

  // 情绪曲线
  const yOf = (f) => bandBottom - f * bandH;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const f = feelByStage[i] != null ? feelByStage[i] : 0.5;
    pts.push([cx(i), yOf(f)]);
  }
  for (let i = 0; i < n - 1; i++) {
    const isTroughSeg = (i === trough) || (i + 1 === trough);
    const col = isTroughSeg ? t.accent : t.muted;
    s += `<polyline points="${pts[i][0]},${pts[i][1]} ${pts[i + 1][0]},${pts[i + 1][1]}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }
  for (let i = 0; i < n; i++) s += circle(pts[i][0], pts[i][1], 5, i === trough ? t.accent : t.muted);

  // 内容行
  rowTypes.forEach((rt, k) => {
    const ry = rowTop + k * rowH;
    s += T(56, ry + 18, opts.lang === 'en' ? labelEn[rt] : labelZh[rt], { size: 8, mono: true, anchor: 'end', color: t.muted, track: '0.14em', upper: opts.lang === 'en' });
    const map = rt === 'do' ? rows.do : rt === 'think' ? rows.think : rows.touch;
    for (let i = 0; i < n; i++) s += T(cx(i), ry + 38, map[stages[i]] || '', { size: 12, anchor: 'middle', color: t.ink });
    s += line(mL, ry + rowH, W - mR, ry + rowH, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  });
  // 痛点标记（贴在行为行下方）
  const ak = rowTypes.indexOf('do');
  if (ak >= 0) {
    const ry = rowTop + ak * rowH;
    pains.forEach((p) => {
      const i = stages.indexOf(p.stage);
      if (i < 0 || i >= n) return;
      const pw = Math.min(200, Math.max(80, p.text.length * 7 + 16));
      const px = cx(i) - pw / 2;
      const py = ry + 44;
      s += R(px, py, pw, 16, { fill: t._rgba(t.accent, 0.08), stroke: t._rgba(t.accent, 0.50), sw: 0.8, rx: 2, dash: '3,3' });
      s += T(cx(i), py + 11, p.text, { size: 8, mono: true, anchor: 'middle', color: t.accent });
    });
  }
  // 图例
  s += line(mL, legY, W - mR, legY, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += T(mL, legY + 16, opts.lang === 'en' ? 'LEGEND' : '图例', { size: 8, mono: true, color: t.muted, track: '0.18em', upper: opts.lang === 'en' });
  const c1x = mL, c1y = legY + 34;
  s += `<polyline points="${c1x},${c1y} ${c1x + 16},${c1y}" fill="none" stroke="${t.muted}" stroke-width="1.5"/>`;
  s += circle(c1x + 8, c1y, 3, t.muted);
  s += T(c1x + 24, c1y + 4, opts.lang === 'en' ? 'Sentiment curve' : '情绪曲线', { size: 8.5, color: t.muted });
  const c2x = c1x + 170;
  s += `<polyline points="${c2x},${c1y} ${c2x + 16},${c1y}" fill="none" stroke="${t.accent}" stroke-width="1.5"/>`;
  s += circle(c2x + 8, c1y, 3, t.accent);
  s += T(c2x + 24, c1y + 4, opts.lang === 'en' ? 'Trough stage' : '低谷阶段', { size: 8.5, color: t.muted });
  const c3x = c2x + 170;
  s += R(c3x, c1y - 4, 16, 8, { fill: t._rgba(t.accent, 0.08), stroke: t._rgba(t.accent, 0.50), sw: 0.8, rx: 2, dash: '3,3' });
  s += T(c3x + 24, c1y + 4, opts.lang === 'en' ? 'Pain marker' : '痛点标记', { size: 8.5, color: t.muted });
  s += svgClose();
  return s;
}

// ===========================================================================
// 3. 服务蓝图 Service blueprint
//    DSL:
//      stage: 注册
//      cell: customer | 注册 | 创建账号
//      cell: frontstage | 注册 | 欢迎页
//      cell: backstage | 注册 | 写CRM | dunning 4h | focal
//      cell: support | 注册 | 邮件
//    layer ∈ evidence|customer|frontstage|backstage|support
//    前台/后台之间用可见性线(visibility)分隔；焦点单元 ≤1 用 accent。
// ===========================================================================
export function renderServiceBlueprint(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const W = opts.w || 860;
  const baseH = opts.h || 720;
  const T = mkText(t);
  const R = mkRect(t);

  const lines = parseBlock(data);
  const stages = [];
  const cells = {};
  let hasEvidence = false, hasSupport = false;
  lines.forEach((L) => {
    if (L.key === 'stage') stages.push(L.args[0] || ('阶段' + (stages.length + 1)));
    else if (L.key === 'cell' || L.key === 'layer') {
      const layer = (L.args[0] || 'customer').toLowerCase();
      const st = L.args[1] || '';
      const textv = L.args[2] || '';
      const sub = L.args[3] || '';
      const focal = (L.args[4] || '').toLowerCase() === 'focal' || (L.args[4] || '').toLowerCase() === 'focus';
      if (layer === 'evidence') hasEvidence = true;
      if (layer === 'support') hasSupport = true;
      (cells[layer] = cells[layer] || {})[st] = { text: textv, sub, focal };
    }
  });
  if (!stages.length) stages.push(...(opts.lang === 'en' ? ['Stage 1', 'Stage 2', 'Stage 3'] : ['阶段1', '阶段2', '阶段3']));
  const n = Math.min(6, stages.length);

  const top = opts.title ? 40 : 8;
  const mL = 96, mR = 24;
  const slot = (W - mL - mR) / n;
  const colW = Math.max(80, slot - 16);
  const cx = (i) => mL + slot * (i + 0.5);

  const layerDefs = [
    { key: 'evidence', label: 'EVIDENCE', h: 48, req: false, fill: t.paper, stroke: t.ink },
    { key: 'customer', label: 'CUSTOMER', h: 64, req: true, fill: t.paper, stroke: t.ink },
    { key: 'frontstage', label: 'FRONTSTAGE', h: 64, req: true, fill: t.paper, stroke: t.ink },
    { key: 'backstage', label: 'BACKSTAGE', h: 64, req: true, fill: t._rgba(t.ink, 0.06), stroke: t.muted },
    { key: 'support', label: 'SUPPORT', h: 48, req: false, fill: t._rgba(t.ink, 0.06), stroke: t.muted },
  ];
  const active = layerDefs.filter((d) => d.req || (d.key === 'evidence' && hasEvidence) || (d.key === 'support' && hasSupport));

  const headerY = top + 8, headerH = 48;
  let curY = headerY + headerH;
  const layout = [];
  active.forEach((d) => {
    layout.push({ type: 'layer', def: d, y: curY }); curY += d.h;
    if (d.key === 'customer') layout.push({ type: 'line', role: 'interaction', y: curY });
    if (d.key === 'frontstage') layout.push({ type: 'line', role: 'visibility', y: curY });
    if (d.key === 'backstage') layout.push({ type: 'line', role: 'internal-interaction', y: curY });
  });
  const bottom = curY;
  const legY = bottom + 24;
  const needH = legY + 44;
  const H = Math.ceil(Math.max(baseH, needH) / 4) * 4;

  let s = svgOpen(W, H, theme);
  if (opts.title) s += T(32, 28, opts.title, { size: 18, weight: '700', color: t.ink });

  // 阶段表头
  for (let i = 0; i < n; i++) {
    s += T(cx(i), headerY + 18, (opts.lang === 'en' ? 'STAGE ' : '阶段 ') + (i + 1), { size: 8, mono: true, anchor: 'middle', color: t.muted, track: '0.14em', upper: opts.lang === 'en' });
    s += T(cx(i), headerY + 38, stages[i], { size: 12, weight: '600', anchor: 'middle', color: t.ink });
  }
  // 层与发丝线
  layout.forEach((item) => {
    if (item.type === 'layer') {
      const d = item.def;
      s += T(mL - 8, item.y + d.h / 2 + 3, d.label, { size: 8, mono: true, anchor: 'end', color: t.muted, track: '0.12em', upper: true });
      for (let i = 0; i < n; i++) {
        const x = mL + (slot - colW) / 2 + i * slot;
        const cell = (cells[d.key] && cells[d.key][stages[i]]) || null;
        const fill = cell && cell.focal ? t.accentTint : d.fill;
        const stroke = cell && cell.focal ? t.accent : d.stroke;
        s += R(x, item.y, colW, d.h, { fill, stroke, sw: 1, rx: 4 });
        const txt = cell ? cell.text : '—';
        if (cell && cell.focal) {
          s += T(cx(i), item.y + d.h / 2 - 2, txt, { size: 12, weight: '600', anchor: 'middle', color: t.accent });
          if (cell.sub) s += T(cx(i), item.y + d.h / 2 + 14, cell.sub, { size: 8, mono: true, anchor: 'middle', color: t.muted });
        } else {
          s += T(cx(i), item.y + d.h / 2 + 4, txt, { size: 12, anchor: 'middle', color: t.ink });
          if (cell && cell.sub) s += T(cx(i), item.y + d.h / 2 + 18, cell.sub, { size: 8, mono: true, anchor: 'middle', color: t.muted });
        }
      }
    } else {
      if (item.role === 'visibility') s += line(mL, item.y, W - mR, item.y, t, { color: t._rgba(t.ink, 0.55), width: 2 });
      else s += line(mL, item.y, W - mR, item.y, t, { color: t.rule, width: 1 });
    }
  });
  // 图例
  s += line(mL, legY, W - mR, legY, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += T(mL, legY + 16, opts.lang === 'en' ? 'LEGEND' : '图例', { size: 8, mono: true, color: t.muted, track: '0.18em', upper: opts.lang === 'en' });
  let lx = mL;
  const visTxt = opts.lang === 'en' ? 'Line of visibility' : '可见性线';
  s += line(lx, legY + 34, lx + 28, legY + 34, t, { color: t._rgba(t.ink, 0.55), width: 2 });
  s += T(lx + 36, legY + 38, visTxt, { size: 8.5, color: t.muted });
  lx += 36 + visTxt.length * 7 + 24;
  const bsTxt = opts.lang === 'en' ? 'Backstage layer' : '后台层';
  s += R(lx, legY + 30, 16, 10, { fill: t._rgba(t.ink, 0.06), stroke: t.muted, sw: 1, rx: 2 });
  s += T(lx + 24, legY + 38, bsTxt, { size: 8.5, color: t.muted });
  lx += 24 + bsTxt.length * 7 + 24;
  const fTxt = opts.lang === 'en' ? 'Focal cell' : '焦点单元';
  s += R(lx, legY + 30, 16, 10, { fill: t.accentTint, stroke: t.accent, sw: 1, rx: 2 });
  s += T(lx + 24, legY + 38, fTxt, { size: 8.5, color: t.muted });
  s += svgClose();
  return s;
}

// ===========================================================================
// 4. 故事地图 Story map
//    DSL:
//      backbone: 发现,试用,购买,留存          # 叙事主轴（活动，左→右）
//      row: 主线 | 落地页,注册,下单,激活       # 行走骨架步骤，按活动对齐
//      step: 发现 | 搜索数据集                 # 等价于某个活动的步骤
//      slice: MVP | 关键词搜索~RPT-101·3pt, 表格~RPT-102·5pt, 公开链接, 更新戳
//      slice: RELEASE 2 | 定时邮件, !行级权限~RPT-114·3pt   # 前导 ! 标记最高风险卡
//    MVP 切片下方画发布切割线(accent)；最高风险卡(accent 虚线 + RISK 标签)。
// ===========================================================================
function zhSlice(name) {
  const k = String(name || '').toLowerCase().trim();
  const map = { mvp: '首版', later: '后续', 'release 1': '发布1', 'release 2': '发布2', 'release 3': '发布3' };
  return map[k] || name;
}

export function renderStoryMap(data, theme, opts = {}) {
  const t = expandTheme(theme);
  const W = opts.w || 860;
  const baseH = opts.h || 540;
  const T = mkText(t);
  const R = mkRect(t);

  const lines = parseBlock(data);
  let activities = [];
  const steps = {};
  const slices = [];
  lines.forEach((L) => {
    if (L.key === 'backbone') activities = L.args.map((a) => a.trim()).filter(Boolean);
    else if (L.key === 'step') {
      const a = L.args[0] || '';
      const title = L.args.slice(1).join('|').trim();
      (steps[a] = steps[a] || []).push(title);
    } else if (L.key === 'row') {
      const list = (L.args[1] || '').split(',').map((x) => x.trim()).filter(Boolean);
      list.forEach((v, i) => { if (i < activities.length) (steps[activities[i]] = steps[activities[i]] || []).push(v); });
    } else if (L.key === 'slice') {
      const name = L.args[0] || (opts.lang === 'en' ? 'RELEASE' : '发布');
      const items = L.args.slice(1).map((sv) => {
        let risk = false;
        let v = sv.trim();
        if (v.startsWith('!')) { risk = true; v = v.slice(1).trim(); }
        const parts = v.split('~');
        return { title: parts[0] || '', sub: (parts[1] || '').trim(), risk };
      });
      slices.push({ name, items });
    }
  });
  if (!activities.length) activities = opts.lang === 'en' ? ['Activity 1', 'Activity 2', 'Activity 3'] : ['活动1', '活动2', '活动3'];
  const n = Math.min(5, activities.length);

  const top = opts.title ? 40 : 8;
  const mL = 32, mR = 32, gut = 24;
  const colW = Math.max(120, snap((W - mL - mR - gut * (n - 1)) / n));
  const slot = colW + gut;
  const totalW = colW * n + gut * (n - 1);
  const startX = Math.round((W - totalW) / 2);
  const colX = (i) => startX + i * slot;

  const bbY = top + 8, bbH = 64;
  const skY = bbY + bbH + 8, skStepH = 32, skGap = 8;
  const skH = skStepH * 2 + skGap;
  const slicesTop = skY + skH + 8;
  const sliceH = 80;
  const rowsBottom = slicesTop + slices.length * sliceH;
  const cutY = slicesTop + sliceH;
  const legY = rowsBottom + 24;
  const needH = legY + 44;
  const H = Math.ceil(Math.max(baseH, needH) / 4) * 4;

  let s = svgOpen(W, H, theme);
  if (opts.title) s += T(32, 28, opts.title, { size: 18, weight: '700', color: t.ink });

  // 切片背景带（交替）
  slices.forEach((sl, k) => { if (k % 2 === 1) s += R(mL, slicesTop + k * sliceH, totalW, sliceH, { fill: t._rgba(t.ink, 0.02) }); });
  // 切片标签
  slices.forEach((sl, k) => {
    const lab = opts.lang === 'en' ? sl.name : zhSlice(sl.name);
    s += T(mL + 16, slicesTop + k * sliceH + sliceH / 2 + 3, lab, { size: 8, mono: true, color: t.muted, track: '0.14em', upper: opts.lang === 'en' });
  });
  // 列分隔虚线（行走骨架区 → 末尾切片）
  s += line(startX, skY, startX, rowsBottom, t, { color: t._rgba(t.ink, 0.10), width: 0.8, dash: '4,4' });
  for (let i = 0; i < n; i++) {
    const x = colX(i) + colW;
    s += line(x, skY, x, rowsBottom, t, { color: t._rgba(t.ink, 0.10), width: 0.8, dash: '4,4' });
  }
  // 叙事主轴卡片
  activities.slice(0, n).forEach((a, i) => {
    const x = colX(i);
    s += R(x, bbY, colW, bbH, { fill: t._rgba(t.ink, 0.05), stroke: t.muted, sw: 1, rx: 6 });
    s += T(x + colW / 2, bbY + 28, a, { size: 12, weight: '600', anchor: 'middle', color: t.ink });
    s += T(x + colW / 2, bbY + 48, (opts.lang === 'en' ? 'ACTIVITY ' : '活动 ') + (i + 1), { size: 8, mono: true, anchor: 'middle', color: t.muted, track: '0.14em', upper: opts.lang === 'en' });
  });
  // 行走骨架步骤
  activities.slice(0, n).forEach((a, i) => {
    const x = colX(i);
    (steps[a] || []).slice(0, 2).forEach((stt, j) => {
      const y = skY + j * (skStepH + skGap);
      s += R(x + 8, y, colW - 16, skStepH, { fill: t.paper, stroke: t.ink, sw: 0.8, rx: 4 });
      s += T(x + 16, y + 21, stt, { size: 12, anchor: 'start', color: t.ink });
    });
  });
  // 切片故事卡
  slices.forEach((sl, k) => {
    const y0 = slicesTop + k * sliceH + 16;
    for (let i = 0; i < n; i++) {
      const it = sl.items[i];
      if (!it || !it.title) continue;
      const x = colX(i) + 8;
      const cw = colW - 16;
      const ch = 48;
      const fill = it.risk ? t.accentTint : t.paper;
      const stroke = it.risk ? t.accent : t.ink;
      const dash = it.risk ? '4,4' : null;
      s += R(x, y0, cw, ch, { fill, stroke, sw: 1, rx: 4, dash });
      s += T(x + 12, y0 + 20, it.title, { size: 12, weight: '600', anchor: 'start', color: t.ink });
      if (it.sub) s += T(x + 12, y0 + 36, it.sub, { size: 9, mono: true, anchor: 'start', color: t.muted });
      if (it.risk) {
        s += R(x + cw - 44, y0 + ch - 18, 40, 12, { fill: 'transparent', stroke: t.accent, sw: 0.8, rx: 2 });
        s += T(x + cw - 24, y0 + ch - 9, 'RISK', { size: 8, mono: true, anchor: 'middle', color: t.accent });
      }
    }
  });
  // 发布切割线（MVP 切片下方）
  if (slices.length) {
    s += line(mL, cutY, W - mR, cutY, t, { color: t.accent, width: 1.5 });
    const cutTxt = opts.lang === 'en' ? 'RELEASE CUT' : '发布切割';
    const lw = cutTxt.length * 7 + 16;
    const lx = W - mR - lw - 8;
    s += R(lx, cutY - 9, lw, 8, { fill: t.paper });
    s += T(lx + lw / 2, cutY - 2, cutTxt, { size: 8, mono: true, anchor: 'middle', color: t.accent, track: '0.1em', upper: opts.lang === 'en' });
  }
  // 图例
  s += line(mL, legY, W - mR, legY, t, { color: t._rgba(t.ink, 0.10), width: 0.8 });
  s += T(mL, legY + 16, opts.lang === 'en' ? 'LEGEND' : '图例', { size: 8, mono: true, color: t.muted, track: '0.18em', upper: opts.lang === 'en' });
  let lx = mL;
  const k1 = opts.lang === 'en' ? 'Story card' : '故事卡片';
  s += R(lx, legY + 28, 16, 8, { fill: t.paper, stroke: t.ink, sw: 1, rx: 2 });
  s += T(lx + 24, legY + 36, k1, { size: 8.5, color: t.muted });
  lx += 24 + k1.length * 7 + 24;
  const k2 = opts.lang === 'en' ? 'Highest risk' : '最高风险';
  s += R(lx, legY + 28, 16, 8, { fill: t.accentTint, stroke: t.accent, sw: 1, rx: 2, dash: '4,4' });
  s += T(lx + 24, legY + 36, k2, { size: 8.5, color: t.muted });
  lx += 24 + k2.length * 7 + 24;
  const k3 = opts.lang === 'en' ? 'Release cut' : '发布切割';
  s += line(lx, legY + 32, lx + 28, legY + 32, t, { color: t.accent, width: 1.5 });
  s += T(lx + 36, legY + 36, k3, { size: 8.5, color: t.muted });
  s += svgClose();
  return s;
}
