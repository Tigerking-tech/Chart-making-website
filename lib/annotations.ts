// lib/annotations.ts — 把标注（callout）烘焙进 SVG，使其随导出（SVG/PNG/PPTX）一并带走。
// 标注坐标为相对百分比（0–100），与图表原始尺寸无关，故在响应式 SVG 上也能稳定定位。

export interface Annotation {
  id: string;
  text: string;
  x: number; // 0–100 百分比
  y: number; // 0–100 百分比
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 把标注叠加到 SVG 末尾（</svg> 之前）。
 * @param svg       原始自包含 SVG 字符串
 * @param list      标注列表
 * @param color     标注主色（默认警示红）
 */
export function withAnnotations(svg: string, list: Annotation[], color = '#E0301E'): string {
  if (!list || !list.length || !svg) return svg;
  const vb = svg.match(/viewBox="([\d.\s]+)"/);
  if (!vb) return svg;
  const dims = vb[1].trim().split(/\s+/).map(Number);
  const w = dims[dims.length - 2];
  const h = dims[dims.length - 1];
  if (!w || !h) return svg;

  const parts = list.map((a) => {
    const px = (a.x / 100) * w;
    const py = (a.y / 100) * h;
    const boxW = Math.min(240, Math.max(72, (a.text || '').length * 8 + 18));
    const boxH = 30;
    // 盒子朝远离图像中心的一侧展开，避免越界
    const flip = px > w * 0.5;
    let bx = flip ? px - 14 - boxW : px + 14;
    if (bx < 2) bx = 2;
    if (bx + boxW > w) bx = w - boxW - 2;
    let by = py - boxH / 2;
    if (by < 2) by = 2;
    if (by + boxH > h) by = h - boxH - 2;
    const anchorX = flip ? bx + boxW : bx;
    const lineY = by + boxH / 2;
    const tx = bx + 9;
    const ty = by + boxH / 2 + 4.5;
    return `<g class="cf-anno" data-id="${escapeXml(a.id)}">
  <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${anchorX.toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="${color}" stroke-width="1"/>
  <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${boxW}" height="${boxH}" rx="6" fill="#ffffff" stroke="${color}" stroke-width="1.2" opacity="0.97"/>
  <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="13" fill="#1A1A1A">${escapeXml(a.text)}</text>
</g>`;
  });

  return svg.replace(/<\/svg>\s*$/i, parts.join('\n') + '\n</svg>');
}
