// MSA / Gage R&R（量具重复性与再现性）报告图：%研究变异条形 + 数值表 + AIAG 判定。
import { svgOpen, svgClose, text, line, rect, scale, esc } from '../base.js';
import { gageRR } from './spc.js';

export function renderMsa(data, theme, opts = {}) {
  const W = opts.w || 960, H = opts.h || 560;
  const L = opts.lang === 'en';
  const r = gageRR(data);
  const top = opts.showTitle === false ? 30 : 70;
  let s = svgOpen(W, H, theme);
  if (opts.showTitle !== false) {
    s += text(70, 38, opts.title || (L ? 'Gage R&R Study' : '量具重复性与再现性分析'), theme, { size: 20, weight: '700' });
  }
  // 判定（副标题，按结果着色 + 本地化）
  const clsColor = r.cls.key === 'ok' ? theme.accent : r.cls.key === 'warn' ? theme.accent2 : '#c8102e';
  const clsText = r.cls.key === 'ok' ? (L ? 'Gage system acceptable (GRR < 10%)' : '量具系统可接受 (GRR < 10%)')
    : r.cls.key === 'warn' ? (L ? 'Gage system marginal (10% ≤ GRR ≤ 30%)' : '量具系统临界 (10% ≤ GRR ≤ 30%)')
    : (L ? 'Gage system unacceptable (GRR > 30%)' : '量具系统不可接受 (GRR > 30%)');
  s += text(70, 58, (L ? 'Verdict: ' : '判定：') + clsText, theme, { size: 13, color: clsColor });

  // ---- 左：%研究变异条形 ----
  const cx0 = 70, cx1 = W * 0.52, cy0 = top + 24, cy1 = H - 70;
  const cats = [
    { name: L ? 'Repeatability' : '重复性', v: r.pctEV, sw: 'EV' },
    { name: L ? 'Reproducibility' : '再现性', v: r.pctAV, sw: 'AV' },
    { name: L ? 'Gage R&R' : '量具R&R', v: r.pctGRR, sw: 'GRR' },
    { name: L ? 'Part-to-Part' : '零件间', v: r.pctPV, sw: 'PV' },
  ];
  const n = cats.length, gap = (cx1 - cx0) / n;
  const yOf = scale(0, 100, cy1, cy0);
  // 网格 + Y 轴标签（0..100，受 gridlines.major 开关）
  const major = opts.gridlines ? opts.gridlines.major !== false : true;
  for (let v = 0; v <= 100; v += 20) {
    const y = yOf(v);
    if (major) s += line(cx0, y, cx1, y, theme, { color: theme.grid, width: 1 });
    s += text(cx0 - 8, y + 4, String(v), theme, { size: 10, color: theme.gridText, anchor: 'end' });
  }
  // 接收阈值线 10% / 30%
  s += line(cx0, yOf(10), cx1, yOf(10), theme, { color: theme.accent2, width: 1, dash: '4 4' });
  s += line(cx0, yOf(30), cx1, yOf(30), theme, { color: '#c8102e', width: 1, dash: '4 4' });
  // 柱
  const bw = gap * 0.5;
  cats.forEach((c, i) => {
    const x = cx0 + gap * i + (gap - bw) / 2;
    const y = yOf(c.v);
    const fill = c.sw === 'GRR' ? (r.cls.key === 'ok' ? theme.accent : r.cls.key === 'warn' ? theme.accent2 : '#c8102e') : theme.accent;
    s += rect(x, y, bw, cy1 - y, theme, { fill, rx: 2 });
    s += text(x + bw / 2, y - 8, c.v.toFixed(1) + '%', theme, { size: 11, color: theme.ink, anchor: 'middle', weight: '600' });
    s += text(x + bw / 2, cy1 + 18, c.name, theme, { size: 11, color: theme.muted, anchor: 'middle' });
  });
  s += text(cx0, cy1 + 40, L ? '% Study Variation' : '占合计量 %（研究变异）', theme, { size: 11, color: theme.muted });

  // ---- 右：数值表 ----
  const tx = W * 0.58, ty = top + 30, rowH = 30;
  const rows = [
    { k: L ? 'Repeatability (EV)' : '重复性 EV', v: r.EV.toFixed(4), p: r.pctEV.toFixed(1) + '%' },
    { k: L ? 'Reproducibility (AV)' : '再现性 AV', v: r.AV.toFixed(4), p: r.pctAV.toFixed(1) + '%' },
    { k: L ? 'Gage R&R' : '量具R&R', v: r.GRR.toFixed(4), p: r.pctGRR.toFixed(1) + '%' },
    { k: L ? 'Part-to-Part (PV)' : '零件间 PV', v: r.PV.toFixed(4), p: r.pctPV.toFixed(1) + '%' },
    { k: L ? 'Total Variation' : '合计量 TV', v: r.TV.toFixed(4), p: '100%' },
    { k: L ? 'ndc (≥5)' : '可辨类别数 ndc(≥5)', v: r.ndc.toFixed(2), p: r.ndc >= 5 ? (L ? 'OK' : '合格') : (L ? 'Low' : '偏低') },
  ];
  rows.forEach((row, i) => {
    const y = ty + i * rowH;
    s += text(tx, y, row.k, theme, { size: 12, color: theme.ink });
    s += text(tx + 230, y, row.v, theme, { size: 12, color: theme.muted, anchor: 'end' });
    s += text(tx + 300, y, row.p, theme, { size: 12, color: theme.accent, anchor: 'end' });
  });
  s += line(tx, ty - 12, tx + 300, ty - 12, theme, { color: theme.grid, width: 1 });
  s += svgClose();
  return s;
}
