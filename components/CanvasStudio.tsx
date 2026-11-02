'use client';
import { useMemo, useState, useEffect } from 'react';
import {
  CHART_TYPES, renderChart, samplesFor, checkContrast,
} from '@/lib/charts';
import { fetchBrandFromUrl } from '@/lib/engine/themes/brand.js';
import { withAnnotations, Annotation } from '@/lib/annotations';
import { FileDrop } from './FileDrop';
import { AnnotationLayer } from './AnnotationLayer';
import { shareUrl, readSharedState } from '@/lib/shareState';
import { Lang, t, chartName } from '@/lib/i18n';

interface Block {
  id: string;
  type: string;
  csv: string;
  fish: string;
  title: string;
  usl: string;
  lsl: string;
  showTitle: boolean;
  dataLabels: boolean;
  legend: string;
  annotations: Annotation[];
}

const STD_KEYS = ['gen', 'iso', 'iatf', 'ppap'] as const;
const DEFAULT_ACCENT = '#2F6FED';
const DEFAULT_ACCENT2 = '#F5803E';

// 真正拥有多序列、需要图例框的图型；其余图型无图例，UI 隐藏图例控件。
const LEGEND_TYPES = ['pareto', 'scatter', 'capability'];
// 画了数值标注、可用“数据标签”开关控制的图型。
const DATA_LABEL_TYPES = ['bar', 'pareto'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** 把响应式 SVG 变成固定尺寸版本，便于栅格化为 PNG。 */
function withExplicitSize(svgString: string) {
  const vb = svgString.match(/viewBox="([\d.\s]+)"/);
  if (!vb) return svgString;
  const [w, h] = vb[1].trim().split(/\s+/).slice(2).map(Number);
  return svgString
    .replace(/width="100%"/, `width="${w}" height="${h}"`)
    .replace(/font-family='([^']*)'/, `font-family="$1"`);
}

async function svgToPng(svg: string, scale = 2): Promise<{ dataUrl: string; w: number; h: number }> {
  const sized = withExplicitSize(svg);
  const vb = sized.match(/viewBox="([\d.\s]+)"/);
  const [w, h] = vb ? vb[1].trim().split(/\s+/).slice(2).map(Number) : [960, 540];
  const img = new Image();
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('SVG 栅格化失败'));
    img.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/png'), w, h };
}

function ChartBlock({
  lang, block, index, total, accent, accent2, font,
  onPatch, onMoveUp, onMoveDown, onDelete, onDragStart, onDragOver, onDrop, dragging,
}: {
  lang: Lang; block: Block; index: number; total: number;
  accent: string; accent2: string; font: string;
  onPatch: (id: string, patch: Partial<Block>) => void;
  onMoveUp: (i: number) => void; onMoveDown: (i: number) => void; onDelete: (id: string) => void;
  onDragStart: (i: number) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (i: number) => void;
  dragging: boolean;
}) {
  const isFish = block.type === 'fishbone';
  const result = useMemo(() => renderChart({
    type: block.type as any,
    csv: isFish ? '' : block.csv,
    fishboneJson: isFish ? block.fish : undefined,
    title: block.title,
    themeId: 'brand',
    accent, accent2, font,
    usl: block.usl ? Number(block.usl) : null,
    lsl: block.lsl ? Number(block.lsl) : null,
    lang,
    showTitle: block.showTitle,
    dataLabels: block.dataLabels,
    legend: block.legend as any,
  }), [block.type, block.csv, block.fish, block.title, accent, accent2, font, block.usl, block.lsl, lang, block.showTitle, block.dataLabels, block.legend]);

  const bakedSvg = useMemo(() => withAnnotations(result.svg || '', block.annotations), [result.svg, block.annotations]);

  return (
    <div
      className={'block' + (dragging ? ' dragging' : '')}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
    >
      <div className="block-bar no-print">
        <span className="block-idx">{t(lang, 'canvas.figCap').replace('{n}', String(index + 1))}</span>
        <span className="block-name">{chartName(lang, block.type)}</span>
        <span className="block-tools">
          <button className="mini-btn" title={t(lang, 'canvas.moveUp')} onClick={() => onMoveUp(index)} disabled={index === 0}>↑</button>
          <button className="mini-btn" title={t(lang, 'canvas.moveDown')} onClick={() => onMoveDown(index)} disabled={index === total - 1}>↓</button>
          <button className="mini-btn del" title={t(lang, 'canvas.del')} onClick={() => onDelete(block.id)}>✕</button>
        </span>
      </div>

      <div className="block-config no-print">
        <div className="row">
          <div className="field">
            <label>{t(lang, 'canvas.type')}</label>
            <select value={block.type} onChange={(e) => {
              const tp = e.target.value;
              const S = samplesFor(lang);
              const legend = LEGEND_TYPES.includes(tp)
                ? (LEGEND_TYPES.includes(block.type) ? block.legend : 'right')
                : 'none';
              onPatch(block.id, {
                type: tp,
                title: chartName(lang, tp),
                csv: tp === 'fishbone' ? '' : (S as any)[tp] || '',
                fish: tp === 'fishbone' ? S.fishbone : '',
                legend,
              });
            }}>
              {CHART_TYPES.map((c) => <option key={c.id} value={c.id}>{chartName(lang, c.id)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t(lang, 'canvas.titleLabel')}</label>
            <input value={block.title} onChange={(e) => onPatch(block.id, { title: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>{isFish ? t(lang, 'canvas.json') : t(lang, 'canvas.data')}</label>
          {isFish ? (
            <textarea value={block.fish} onChange={(e) => onPatch(block.id, { fish: e.target.value })} style={{ minHeight: 120 }} />
          ) : (
            <textarea value={block.csv} onChange={(e) => onPatch(block.id, { csv: e.target.value })} style={{ minHeight: 120 }} />
          )}
          <FileDrop lang={lang} onCsv={(c) => onPatch(block.id, { csv: c })} hint={t(lang, 'canvas.dropFile')} />
        </div>
        {!isFish && (
          <div className="row">
            <div className="field"><label>{t(lang, 'canvas.usl')}</label><input value={block.usl} onChange={(e) => onPatch(block.id, { usl: e.target.value })} placeholder={t(lang, 'canvas.optPh')} /></div>
            <div className="field"><label>{t(lang, 'canvas.lsl')}</label><input value={block.lsl} onChange={(e) => onPatch(block.id, { lsl: e.target.value })} placeholder={t(lang, 'canvas.optPh')} /></div>
          </div>
        )}
        <div className="layout-row no-print">
          <label className="chk"><input type="checkbox" checked={block.showTitle} onChange={(e) => onPatch(block.id, { showTitle: e.target.checked })} /> {t(lang, 'canvas.showTitle')}</label>
          {DATA_LABEL_TYPES.includes(block.type) && (
            <label className="chk"><input type="checkbox" checked={block.dataLabels} onChange={(e) => onPatch(block.id, { dataLabels: e.target.checked })} /> {t(lang, 'canvas.dataLabels')}</label>
          )}
          {LEGEND_TYPES.includes(block.type) && (
            <span className="legend-sel">
              <span className="lbl">{t(lang, 'canvas.legend')}</span>
              <select value={block.legend} onChange={(e) => onPatch(block.id, { legend: e.target.value })}>
                <option value="right">{t(lang, 'canvas.legendRight')}</option>
                <option value="bottom">{t(lang, 'canvas.legendBottom')}</option>
                <option value="none">{t(lang, 'canvas.legendNone')}</option>
              </select>
            </span>
          )}
        </div>
      </div>

        <div className="block-preview">
          {result.error ? <div className="err">⚠ {result.error}</div> : (
            <AnnotationLayer
              svg={bakedSvg}
              annotations={block.annotations}
              onChange={(list) => onPatch(block.id, { annotations: list })}
              addLabel={t(lang, 'studio.addCallout')}
              hintLabel={t(lang, 'studio.calloutHint')}
              textLabel={t(lang, 'studio.calloutText')}
              delLabel={t(lang, 'studio.calloutDel')}
            />
          )}
        </div>
    </div>
  );
}

export function CanvasStudio({ lang }: { lang: Lang }) {
  const S = samplesFor(lang);
  const [reportTitle, setReportTitle] = useState<string>(t(lang, 'canvas.reportTitlePh'));
  const [orgName, setOrgName] = useState<string>(t(lang, 'canvas.orgNamePh'));
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);
  const [accent2, setAccent2] = useState<string>(DEFAULT_ACCENT2);
  const [font, setFont] = useState<string>("'Inter',Arial,sans-serif");
  const [brandUrl, setBrandUrl] = useState<string>('');
  const [contrastMsg, setContrastMsg] = useState<string>('');
  const [stdKey, setStdKey] = useState<string>('iatf');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [addType, setAddType] = useState<string>('pareto');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [shareMsg, setShareMsg] = useState<string>('');

  // 打开分享链接时从 URL 还原整份画布（lang 由当前页面 cookie 决定，不覆盖）。
  useEffect(() => {
    const s = readSharedState();
    if (!s) return;
    if (typeof s.reportTitle === 'string') setReportTitle(s.reportTitle);
    if (typeof s.orgName === 'string') setOrgName(s.orgName);
    if (s.accent) setAccent(s.accent);
    if (s.accent2) setAccent2(s.accent2);
    if (s.font) setFont(s.font);
    if (s.brandUrl) setBrandUrl(s.brandUrl);
    if (s.stdKey) setStdKey(s.stdKey);
    if (Array.isArray(s.blocks)) {
      setBlocks(s.blocks.map((b: any) => ({
        id: b.id || uid(), type: b.type || 'pareto', csv: b.csv || '',
        fish: b.fish || '', title: b.title || '', usl: b.usl || '', lsl: b.lsl || '',
        showTitle: b.showTitle !== false, dataLabels: b.dataLabels !== false,
        legend: b.legend || 'none', annotations: Array.isArray(b.annotations) ? b.annotations : [],
      })));
    }
  }, []);

  function copyShare() {
    try {
      const url = shareUrl({
        reportTitle, orgName, accent, accent2, font, brandUrl, stdKey,
        blocks: blocks.map((b) => ({
          type: b.type, csv: b.csv, fish: b.fish, title: b.title,
          usl: b.usl, lsl: b.lsl, showTitle: b.showTitle,
          dataLabels: b.dataLabels, legend: b.legend, annotations: b.annotations,
        })),
      });
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(
          () => setShareMsg(t(lang, 'canvas.shareCopied')),
          () => setShareMsg(t(lang, 'canvas.shareFail')),
        );
      } else {
        setShareMsg(url);
      }
    } catch {
      setShareMsg(t(lang, 'canvas.shareFail'));
    }
  }

  const stdLabel = t(lang, 'report.std.' + stdKey);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function addBlock() {
    const b: Block = {
      id: uid(),
      type: addType,
      csv: addType === 'fishbone' ? '' : (S as any)[addType] || '',
      fish: addType === 'fishbone' ? S.fishbone : '',
      title: chartName(lang, addType),
      usl: '', lsl: '',
      showTitle: true,
      dataLabels: true,
      legend: LEGEND_TYPES.includes(addType) ? 'right' : 'none',
      annotations: [],
    };
    setBlocks((bs) => [...bs, b]);
  }
  function patchBlock(id: string, patch: Partial<Block>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function moveUp(i: number) {
    if (i === 0) return;
    setBlocks((bs) => { const a = bs.slice(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  }
  function moveDown(i: number) {
    if (i === blocks.length - 1) return;
    setBlocks((bs) => { const a = bs.slice(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; return a; });
  }
  function delBlock(id: string) { setBlocks((bs) => bs.filter((b) => b.id !== id)); }
  function reorder(from: number, to: number) {
    if (from === to || from == null) return;
    setBlocks((bs) => { const a = bs.slice(); const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; });
  }

  async function onBrandFetch() {
    if (!brandUrl.trim()) return;
    try {
      const b = await fetchBrandFromUrl(brandUrl.trim());
      if (b.accent) setAccent(b.accent);
      if (b.accent2) setAccent2(b.accent2);
      if (b.font) setFont(b.font);
      const r = checkContrast(b.accent || accent);
      setContrastMsg(`${t(lang, 'canvas.contrastPrefix')} ${r.ratio} · ${r.message}`);
    } catch (e: any) {
      setContrastMsg(t(lang, 'canvas.fetchFail') + (e?.message || 'unknown error'));
    }
  }

  async function exportPptx() {
    if (!blocks.length) { alert(t(lang, 'canvas.noBlock')); return; }
    setBusy(true);
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
      pptx.layout = 'W';

      // 封面
      const cover = pptx.addSlide();
      cover.background = { color: 'FFFFFF' };
      cover.addText(reportTitle || t(lang, 'canvas.title'), { x: 0.7, y: 2.2, w: 11.9, h: 1.2, fontSize: 32, bold: true, color: '1A1A1A' });
      cover.addText(orgName || '', { x: 0.7, y: 3.5, w: 11.9, h: 0.6, fontSize: 18, color: '555555' });
      cover.addText(`${stdLabel}  ·  ${today}`, { x: 0.7, y: 4.3, w: 11.9, h: 0.5, fontSize: 14, color: accent.replace('#', '') });
      cover.addText('ChartForge · Brand Canvas', { x: 0.7, y: 6.7, w: 11.9, h: 0.4, fontSize: 11, color: '999999' });

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const isFish = b.type === 'fishbone';
        const r = renderChart({
          type: b.type as any,
          csv: isFish ? '' : b.csv,
          fishboneJson: isFish ? b.fish : undefined,
          title: b.title,
          themeId: 'brand', accent, accent2, font,
          usl: b.usl ? Number(b.usl) : null,
          lsl: b.lsl ? Number(b.lsl) : null,
          lang,
          showTitle: b.showTitle,
          dataLabels: b.dataLabels,
          legend: b.legend as any,
        });
        if (!r.svg) continue;
        const baked = withAnnotations(r.svg, b.annotations);
        const { dataUrl, w, h } = await svgToPng(baked, 2);
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        slide.addText(`${t(lang, 'canvas.figCap').replace('{n}', String(i + 1))} · ${b.title}`, { x: 0.5, y: 0.35, w: 12.3, h: 0.6, fontSize: 18, bold: true, color: '1A1A1A' });
        const maxW = 11.5, maxH = 6.0;
        const ratio = Math.min(maxW / w, maxH / h);
        const iw = w * ratio, ih = h * ratio;
        slide.addImage({ data: dataUrl, x: (13.33 - iw) / 2, y: 1.1 + (maxH - ih) / 2, w: iw, h: ih });
      }
      await pptx.writeFile({ fileName: t(lang, 'canvas.pptxName') });
    } catch (e: any) {
      alert('PPTX 导出失败：' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="canvas-studio">
        <aside className="panel canvas-brand no-print">
          <h3>{t(lang, 'canvas.brandH')}</h3>
          <div className="field"><label>{t(lang, 'canvas.reportTitle')}</label><input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} /></div>
          <div className="field"><label>{t(lang, 'canvas.orgName')}</label><input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></div>
          <div className="row">
            <div className="field"><label>{t(lang, 'studio.primary')}</label><input value={accent} onChange={(e) => setAccent(e.target.value)} /></div>
            <div className="field"><label>{t(lang, 'studio.secondary')}</label><input value={accent2} onChange={(e) => setAccent2(e.target.value)} /></div>
          </div>
          <div className="field"><label>{t(lang, 'studio.font')}</label><input value={font} onChange={(e) => setFont(e.target.value)} /></div>
          <div className="field">
            <label>{t(lang, 'canvas.fetchColor')}</label>
            <div className="row">
              <input value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} placeholder={t(lang, 'canvas.fetchColorPh')} />
              <button className="btn btn-ghost" onClick={onBrandFetch}>{t(lang, 'canvas.fetchBtn')}</button>
            </div>
          </div>
          {contrastMsg && <div className="mini">{contrastMsg}</div>}
          <div className="field">
            <label>{t(lang, 'canvas.std')}</label>
            <select value={stdKey} onChange={(e) => setStdKey(e.target.value)}>
              {STD_KEYS.map((k) => <option key={k} value={k}>{t(lang, 'report.std.' + k)}</option>)}
            </select>
          </div>

          <h3 style={{ marginTop: 18 }}>{t(lang, 'canvas.canvasH')}</h3>
          <div className="row">
            <select value={addType} onChange={(e) => setAddType(e.target.value)}>
              {CHART_TYPES.map((c) => <option key={c.id} value={c.id}>{chartName(lang, c.id)}</option>)}
            </select>
            <button className="btn btn-primary" onClick={addBlock}>{t(lang, 'canvas.addChart')}</button>
          </div>
          <div className="mini" style={{ marginTop: 6 }}>{t(lang, 'canvas.addHint')}</div>

          <h3 style={{ marginTop: 18 }} className="no-print">{t(lang, 'canvas.exportH')}</h3>
          <div className="col no-print">
            <button className="btn btn-ghost" onClick={() => window.print()}>{t(lang, 'canvas.exportPdf')}</button>
            <button className="btn btn-primary" onClick={exportPptx} disabled={busy || !blocks.length}>
              {busy ? t(lang, 'canvas.generating') : t(lang, 'canvas.exportPptx')}
            </button>
            <button className="btn btn-ghost" onClick={copyShare}>{t(lang, 'canvas.share')}</button>
            {shareMsg && <div className="mini" style={{ wordBreak: 'break-all' }}>{shareMsg}</div>}
          </div>
        </aside>

        <div className="canvas-main">
          <div className="report-doc" id="canvas-doc">
            <div className="report-head">
              <div>
                <h2>{reportTitle || t(lang, 'canvas.title')}</h2>
                <div className="meta">{orgName}</div>
              </div>
              <div className="std">{stdLabel}</div>
            </div>

            {blocks.length === 0 ? (
              <div className="preview" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mini">{t(lang, 'canvas.empty')}</span>
              </div>
            ) : (
              <div className="canvas-blocks">
                {blocks.map((b, i) => (
                  <ChartBlock
                    key={b.id} lang={lang} block={b} index={i} total={blocks.length}
                    accent={accent} accent2={accent2} font={font}
                    onPatch={patchBlock} onMoveUp={moveUp} onMoveDown={moveDown} onDelete={delBlock}
                    onDragStart={setDragIndex} onDragOver={(e) => e.preventDefault()}
                    onDrop={(to) => { reorder(dragIndex as number, to); setDragIndex(null); }}
                    dragging={dragIndex === i}
                  />
                ))}
              </div>
            )}

            <div className="signoff">
              <div className="so"><div className="k">{t(lang, 'canvas.prep')}</div><div className="line" /></div>
              <div className="so"><div className="k">{t(lang, 'canvas.rev')}</div><div className="line" /></div>
              <div className="so"><div className="k">{t(lang, 'canvas.appr')}</div><div className="line" /></div>
              <div className="so"><div className="k">{t(lang, 'canvas.date')}</div><div className="line" />{today}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
