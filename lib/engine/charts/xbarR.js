// X̄-R 控制图：上方面板为均值 X̄ 图，下方面板为极差 R 图。
import { svgOpen, svgClose, text } from '../base.js';
import { xbarR } from './spc.js';
import { controlPanel } from './controlLayout.js';

export function renderXbarR(values, theme, opts = {}) {
  const W = opts.w || 860, H = opts.h || 620;
  const r = xbarR(values, opts.subgroup || 0);
  const n = r.n, k = r.groups.length;

  let s = svgOpen(W, H, theme);
  const L = opts.lang === 'en';
  if (opts.showTitle !== false) {
    s += text(64, 36, opts.title || (L ? 'X̄-R Control Chart' : 'X̄-R 控制图'), theme, { size: 20, weight: '700' });
    s += text(64, 54, L
      ? `Subgroup n=${n} · ${k} subgroups · X̄̄=${r.Xdbl.toFixed(3)} · R̄=${r.Rbar.toFixed(3)}`
      : `子组大小 n=${n} · ${k} 个子组 · X̄̄=${r.Xdbl.toFixed(3)} · R̄=${r.Rbar.toFixed(3)}`, theme, { size: 12, color: theme.muted });
  }

  // 上：X̄ 图
  const xLo = Math.min(...r.xbars, r.xlcl);
  const xHi = Math.max(...r.xbars, r.xucl);
  s += controlPanel(W, H, theme, {
    m: { top: 92, right: 64, bottom: 320, left: 64 },
    title: L ? 'X̄ chart (means)' : 'X̄ 图（均值）',
    subtitle: `CL=${r.xcl.toFixed(3)}  UCL=${r.xucl.toFixed(3)}  LCL=${r.xlcl.toFixed(3)}`,
    yMin: xLo, yMax: xHi, nPoints: k, cl: r.xcl, ucl: r.xucl, lcl: r.xlcl,
    points: r.xbars.map((v, i) => ({ v, flag: v > r.xucl || v < r.xlcl })),
  });

  // 下：R 图
  const rLo = Math.min(...r.Rs, r.rlcl);
  const rHi = Math.max(...r.Rs, r.rucl);
  s += controlPanel(W, H, theme, {
    m: { top: 384, right: 64, bottom: 72, left: 64 },
    title: L ? 'R chart (ranges)' : 'R 图（极差）',
    subtitle: `CL=${r.rcl.toFixed(3)}  UCL=${r.rucl.toFixed(3)}  LCL=${r.rlcl.toFixed(3)}`,
    yMin: rLo, yMax: rHi, nPoints: k, cl: r.rcl, ucl: r.rucl, lcl: r.rlcl,
    points: r.Rs.map((v, i) => ({ v, flag: v > r.rucl || v < r.rlcl })),
  });

  s += svgClose();
  return s;
}
