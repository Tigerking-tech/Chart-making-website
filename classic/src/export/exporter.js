// 导出：SVG（矢量）/ PNG（高清位图），均可直接落进 PPT / 报告 / 论文
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** 把 width="100%" 的响应式 SVG 变成带固定尺寸的版本，便于栅格化。 */
function withExplicitSize(svgString) {
  const vb = svgString.match(/viewBox="([\d.\s]+)"/);
  if (!vb) return svgString;
  const [w, h] = vb[1].trim().split(/\s+/).slice(2).map(Number);
  return svgString
    .replace(/width="100%"/, `width="${w}" height="${h}"`)
    .replace(/font-family='([^']*)'/, `font-family="$1"`);
}

export function downloadSVG(svgString, filename = 'chart.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function downloadPNG(svgString, filename = 'chart.png', scale = 2) {
  const sized = withExplicitSize(svgString);
  const vb = sized.match(/viewBox="([\d.\s]+)"/);
  const [w, h] = vb[1].trim().split(/\s+/).slice(2).map(Number);
  const img = new Image();
  const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => triggerDownload(blob, filename), 'image/png');
  };
  img.src = svg64;
}

/** 把当前 SVG 字符串塞进预览容器。 */
export function mountSVG(container, svgString) {
  container.innerHTML = svgString;
}
