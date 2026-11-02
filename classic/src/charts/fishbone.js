// 鱼骨图 Fishbone（特性要因图）：定性结构图，主骨 + 分支要因 + 子原因
import { svgOpen, svgClose, text, line, rect, circle, esc } from '../base.js';

export function renderFishbone(data, theme, opts = {}) {
  const W = opts.w || 920, H = opts.h || 560;
  const m = { top: 48, right: 200, bottom: 48, left: 60 };
  const spineY = H / 2;
  const spineX0 = m.left;
  const spineX1 = W - m.right;

  const bones = data.bones || [];
  const n = bones.length;

  let s = svgOpen(W, H, theme);
  s += text(m.left, 34, opts.title || '鱼骨图 Fishbone', theme, { size: 20, weight: '700' });

  // 主骨
  s += line(spineX0, spineY, spineX1, spineY, theme, { color: theme.ink, width: 2 });
  // 鱼头（结果框）
  const headW = 150, headH = 56;
  s += rect(spineX1 + 8, spineY - headH / 2, headW, headH, theme, { fill: theme.paper, stroke: theme.ink, sw: 2, rx: 4 });
  s += text(spineX1 + 8 + headW / 2, spineY + 5, esc(data.effect || '结果'), theme, { size: 14, weight: '700', color: theme.ink, anchor: 'middle' });

  // 分支要因：上下交替
  const startX = spineX0 + 30;
  const stepX = (spineX1 - startX) / Math.max(n, 1);
  bones.forEach((b, i) => {
    const top = i % 2 === 0;
    const bx = startX + stepX * (i + 0.5);
    const tipY = top ? spineY - 130 : spineY + 130;
    // 主斜骨
    s += line(bx, spineY, bx - stepX * 0.45, tipY, theme, { color: theme.ink, width: 1.5 });
    // 要因标签
    s += text(bx - stepX * 0.45, top ? tipY - 10 : tipY + 18, esc(b.category), theme, { size: 13, weight: '700', color: theme.accent, anchor: 'middle' });
    // 子原因：沿主骨从分支末端向主脊柱方向排列
    const causes = b.causes || [];
    const span = Math.abs(spineY - tipY);
    const cStep = span / (Math.max(causes.length, 1) + 1);
    causes.forEach((c, j) => {
      const cy = top ? tipY + cStep * (j + 1) : tipY - cStep * (j + 1);
      const cx = bx - stepX * 0.22;
      s += text(cx, cy + 4, '• ' + esc(c), theme, { size: 11, color: theme.muted, anchor: 'middle' });
    });
  });

  s += `</svg>`;
  return s;
}
