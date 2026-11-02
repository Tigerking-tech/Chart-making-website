'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHART_TYPES, renderChart, THEME_LIST,
  checkContrast, recommend, samplesFor,
  type ChartReference,
} from '@/lib/charts';
import { downloadSVG, downloadPNG } from '@/lib/engine/export/exporter.js';
import { fetchBrandFromUrl } from '@/lib/engine/themes/brand.js';
import { parseTable } from '@/lib/engine/data/parser.js';
import { withAnnotations, Annotation } from '@/lib/annotations';
import { FileDrop } from './FileDrop';
import { AnnotationLayer } from './AnnotationLayer';
import ReferenceLayer from './ReferenceLayer';
import { shareUrl, readSharedState } from '@/lib/shareState';
import { Lang, t, chartName, groupName } from '@/lib/i18n';

const LEGEND_TYPES = ['pareto', 'scatter', 'capability'];
const DATA_LABEL_TYPES = ['bar', 'pareto'];

export function Studio({ lang }: { lang: Lang }) {
  const S = samplesFor(lang);
  const [type, setType] = useState<string>('pareto');
  const [csv, setCsv] = useState<string>(S.pareto);
  const [fish, setFish] = useState<string>(S.fishbone);
  const [title, setTitle] = useState<string>(chartName(lang, 'pareto'));
  const [themeId, setThemeId] = useState<string>('light');
  const [accent, setAccent] = useState<string>('#2F6FED');
  const [accent2, setAccent2] = useState<string>('#F5803E');
  const [font, setFont] = useState<string>("'Inter',Arial,sans-serif");
  const [usl, setUsl] = useState<string>('');
  const [lsl, setLsl] = useState<string>('');
  const [bins, setBins] = useState<string>('');
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [dataLabels, setDataLabels] = useState<boolean>(true);
  const [cumulative, setCumulative] = useState<boolean>(true);
  const [legend, setLegend] = useState<string>('right');
  const [brandUrl, setBrandUrl] = useState<string>('');
  const [contrastMsg, setContrastMsg] = useState<string>('');
  const [recoMsg, setRecoMsg] = useState<string>('');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [shareMsg, setShareMsg] = useState<string>('');
  // —— 交互叠加层状态（对标竞品：可拖动 / 可开关的线元素）——
  const [references, setReferences] = useState<ChartReference[]>([]);
  const [gridMajor, setGridMajor] = useState<boolean>(true);
  const [trendShow, setTrendShow] = useState<boolean>(false);
  const [trendType, setTrendType] = useState<'linear' | 'poly2'>('linear');
  const [trendCi, setTrendCi] = useState<boolean>(false);
  const [errorBars, setErrorBars] = useState<boolean>(false);
  const [quartileBand, setQuartileBand] = useState<boolean>(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // 打开分享链接时，从 URL 还原整份图表配置（lang 由当前页面 cookie 决定，不覆盖）。
  useEffect(() => {
    const s = readSharedState();
    if (!s) return;
    if (s.type) setType(s.type);
    if (typeof s.csv === 'string') setCsv(s.csv);
    if (typeof s.fish === 'string') setFish(s.fish);
    if (typeof s.title === 'string') setTitle(s.title);
    if (s.themeId) setThemeId(s.themeId);
    if (s.accent) setAccent(s.accent);
    if (s.accent2) setAccent2(s.accent2);
    if (s.font) setFont(s.font);
    if (s.usl !== undefined) setUsl(String(s.usl ?? ''));
    if (s.lsl !== undefined) setLsl(String(s.lsl ?? ''));
    if (s.bins !== undefined) setBins(String(s.bins ?? ''));
    if (typeof s.showTitle === 'boolean') setShowTitle(s.showTitle);
    if (typeof s.dataLabels === 'boolean') setDataLabels(s.dataLabels);
    if (typeof s.cumulative === 'boolean') setCumulative(s.cumulative);
    if (s.legend) setLegend(s.legend);
    if (Array.isArray(s.annotations)) setAnnotations(s.annotations);
    if (Array.isArray(s.references)) setReferences(s.references as ChartReference[]);
    if (typeof s.gridMajor === 'boolean') setGridMajor(s.gridMajor);
    if (typeof s.trendShow === 'boolean') setTrendShow(s.trendShow);
    if (s.trendType) setTrendType(s.trendType);
    if (typeof s.trendCi === 'boolean') setTrendCi(s.trendCi);
    if (typeof s.errorBars === 'boolean') setErrorBars(s.errorBars);
    if (typeof s.quartileBand === 'boolean') setQuartileBand(s.quartileBand);
    setRecoMsg('');
  }, []);

  const isFish = type === 'fishbone';

  const result = useMemo(() => renderChart({
    type: type as any,
    csv: isFish ? '' : csv,
    fishboneJson: isFish ? fish : undefined,
    title,
    lang,
    themeId,
    accent, accent2, font,
    usl: usl ? Number(usl) : null,
    lsl: lsl ? Number(lsl) : null,
    bins: bins ? Number(bins) : 0,
    showTitle,
    dataLabels,
    cumulative,
    legend: legend as any,
    references,
    gridlines: { major: gridMajor, minor: false },
    trend: trendShow ? { show: true, type: trendType, ci: trendCi } : null,
    errorBars,
    quartileBand,
  }), [type, csv, fish, title, themeId, accent, accent2, font, usl, lsl, bins, showTitle, dataLabels, cumulative, legend, references, gridMajor, trendShow, trendType, trendCi, errorBars, quartileBand]);

  const liveSvg = result.svg || '';
  const liveError = result.error;
  const bakedSvg = useMemo(() => withAnnotations(liveSvg, annotations), [liveSvg, annotations]);

  function copyShare() {
    try {
      const url = shareUrl({
        type, csv, fish, title, themeId, accent, accent2, font,
        usl: usl ? Number(usl) : null, lsl: lsl ? Number(lsl) : null,
        bins: bins ? Number(bins) : 0,
        showTitle, dataLabels, cumulative, legend,
        annotations,
        references, gridMajor, trendShow, trendType, trendCi, errorBars, quartileBand,
      });
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(
          () => setShareMsg(t(lang, 'studio.shareCopied')),
          () => setShareMsg(t(lang, 'studio.shareFail')),
        );
      } else {
        setShareMsg(url);
      }
    } catch {
      setShareMsg(t(lang, 'studio.shareFail'));
    }
  }

  function loadSample() {
    if (isFish) setFish(S.fishbone); else setCsv((S as any)[type] || '');
    setTitle(chartName(lang, type));
    setRecoMsg('');
  }
  function onType(tp: string) {
    setType(tp);
    setTitle(chartName(lang, tp));
    setRecoMsg('');
    if (tp === 'fishbone') setFish(S.fishbone); else setCsv((S as any)[tp] || '');
  }
  function onTheme(tp: string) {
    setThemeId(tp);
    if (tp === 'brand') {
      const r = checkContrast(accent);
      setContrastMsg(`${t(lang, 'studio.contrastPrefix')} ${r.ratio} · ${r.message}`);
    } else setContrastMsg('');
  }
  function autoRecommend() {
    try {
      const parsed = parseTable(csv);
      const r = recommend(parsed);
      onType(r.type);
      const reason = t(lang, 'studio.recoMap.' + r.reason) || r.reason;
      setRecoMsg(`${t(lang, 'studio.reco')}：${reason}`);
    } catch {
      setRecoMsg(t(lang, 'studio.recoEmpty'));
    }
  }
  async function onBrandFetch() {
    if (!brandUrl.trim()) return;
    try {
      const b = await fetchBrandFromUrl(brandUrl.trim());
      if (b.accent) setAccent(b.accent);
      if (b.accent2) setAccent2(b.accent2);
      if (b.font) setFont(b.font);
      const r = checkContrast(b.accent || accent);
      setContrastMsg(`${t(lang, 'studio.contrastPrefix')} ${r.ratio} · ${r.message}`);
    } catch (e: any) {
      setContrastMsg(t(lang, 'studio.fetchFail') + (e?.message || 'unknown error'));
    }
  }

  return (
    <div className="container">
      <div className="studio">
        <div className="panel">
          <h3>{t(lang, 'studio.s1')}</h3>
          <div className="field">
            <select value={type} onChange={(e) => onType(e.target.value)}>
              {CHART_TYPES.map((c) => (
                <option key={c.id} value={c.id}>{chartName(lang, c.id)}（{groupName(lang, c.gk)}）</option>
              ))}
            </select>
          </div>

          <h3>{t(lang, 'studio.s2')}</h3>
          <div className="field">
            <label>{isFish ? t(lang, 'studio.jsonLabel') : t(lang, 'studio.dataLabel')}</label>
            {isFish ? (
              <textarea value={fish} onChange={(e) => setFish(e.target.value)} style={{ minHeight: 200 }} />
            ) : (
              <textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
            )}
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={loadSample}>{t(lang, 'studio.loadSample')}</button>
              <button className="btn btn-ghost" onClick={autoRecommend}>{t(lang, 'studio.reco')}</button>
            </div>
            <FileDrop lang={lang} onCsv={(c) => { setCsv(c); setRecoMsg(''); }} hint={t(lang, 'studio.importDrop')} />
            <div className="mini">{t(lang, 'studio.importHint')}</div>
            {recoMsg && <div className="mini" style={{ marginTop: 6 }}>{recoMsg}</div>}
          </div>

          <h3>{t(lang, 'studio.s3')}</h3>
          <div className="field"><label>{t(lang, 'studio.titleLabel')}</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          {!isFish && (
            <div className="row">
              <div className="field"><label>{t(lang, 'studio.usl')}</label><input value={usl} onChange={(e) => setUsl(e.target.value)} placeholder={t(lang, 'studio.optPlaceholder')} /></div>
              <div className="field"><label>{t(lang, 'studio.lsl')}</label><input value={lsl} onChange={(e) => setLsl(e.target.value)} placeholder={t(lang, 'studio.optPlaceholder')} /></div>
            </div>
          )}
          {!isFish && (
            <div className="field"><label>{t(lang, 'studio.bins')}</label><input value={bins} onChange={(e) => setBins(e.target.value)} placeholder="0" /></div>
          )}

          <h3>{t(lang, 'canvas.layoutH')}</h3>
          <div className="layout-row">
            <label className="chk"><input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} /> {t(lang, 'canvas.showTitle')}</label>
            {DATA_LABEL_TYPES.includes(type) && (
              <label className="chk"><input type="checkbox" checked={dataLabels} onChange={(e) => setDataLabels(e.target.checked)} /> {t(lang, 'canvas.dataLabels')}</label>
            )}
            {type === 'pareto' && (
              <label className="chk"><input type="checkbox" checked={cumulative} onChange={(e) => setCumulative(e.target.checked)} /> {t(lang, 'canvas.cumLine')}</label>
            )}
            <label className="chk"><input type="checkbox" checked={gridMajor} onChange={(e) => setGridMajor(e.target.checked)} /> {t(lang, 'canvas.gridMajor')}</label>
            {['line', 'scatter'].includes(type) && (
              <label className="chk"><input type="checkbox" checked={trendShow} onChange={(e) => setTrendShow(e.target.checked)} /> {t(lang, 'canvas.trend')}</label>
            )}
            {type === 'bar' && (
              <label className="chk"><input type="checkbox" checked={errorBars} onChange={(e) => setErrorBars(e.target.checked)} /> {t(lang, 'canvas.errorBars')}</label>
            )}
            {['line', 'scatter', 'capability'].includes(type) && (
              <label className="chk"><input type="checkbox" checked={quartileBand} onChange={(e) => setQuartileBand(e.target.checked)} /> {t(lang, 'canvas.quartile')}</label>
            )}
            {LEGEND_TYPES.includes(type) && (
              <span className="legend-sel">
                <span className="lbl">{t(lang, 'canvas.legend')}</span>
                <select value={legend} onChange={(e) => setLegend(e.target.value)}>
                  <option value="right">{t(lang, 'canvas.legendRight')}</option>
                  <option value="bottom">{t(lang, 'canvas.legendBottom')}</option>
                  <option value="none">{t(lang, 'canvas.legendNone')}</option>
                </select>
              </span>
            )}
          </div>
          {trendShow && ['line', 'scatter'].includes(type) && (
            <div className="row" style={{ marginTop: 6 }}>
              <span className="legend-sel">
                <span className="lbl">{t(lang, 'canvas.trendType')}</span>
                <select value={trendType} onChange={(e) => setTrendType(e.target.value as any)}>
                  <option value="linear">{t(lang, 'canvas.trendLinear')}</option>
                  <option value="poly2">{t(lang, 'canvas.trendPoly')}</option>
                </select>
              </span>
              <label className="chk"><input type="checkbox" checked={trendCi} onChange={(e) => setTrendCi(e.target.checked)} /> {t(lang, 'canvas.trendCi')}</label>
            </div>
          )}

          <h3>{t(lang, 'canvas.refH')}</h3>
          <div className="col">
            <button className="btn btn-ghost" type="button" onClick={() => setReferences((rs) => [...rs, { id: 'r' + Date.now().toString(36), axis: 'y', value: (result.plot?.yMin ?? 0) + ((result.plot?.yMax ?? 1) - (result.plot?.yMin ?? 0)) / 2, label: t(lang, 'canvas.refLabelDef'), color: '#F5803E', dashed: true, width: 1.5, show: true }])}>
              ＋ {t(lang, 'canvas.refAdd')}
            </button>
            {references.length === 0 && <div className="mini">{t(lang, 'canvas.refEmpty')}</div>}
            {references.map((r, i) => (
              <div className="ref-item" key={r.id}>
                <div className="ref-row">
                  <label className="chk"><input type="checkbox" checked={r.show !== false} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, show: e.target.checked } : x))} /> {t(lang, 'canvas.refShow')}</label>
                  <span className="legend-sel">
                    <span className="lbl">{t(lang, 'canvas.refAxis')}</span>
                    <select value={r.axis} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, axis: e.target.value as any } : x))}>
                      <option value="y">{t(lang, 'canvas.refAxisY')}</option>
                      <option value="x">{t(lang, 'canvas.refAxisX')}</option>
                    </select>
                  </span>
                  <input className="ref-val" type="number" value={Number(r.value.toFixed(3))} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, value: Number(e.target.value) } : x))} />
                  <label className="chk"><input type="checkbox" checked={!!r.dashed} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, dashed: e.target.checked } : x))} /> {t(lang, 'canvas.refDashed')}</label>
                  <button className="mini-btn del" type="button" title={t(lang, 'canvas.refDel')} onClick={() => setReferences((rs) => rs.filter((x) => x.id !== r.id))}>✕</button>
                </div>
                <div className="ref-row">
                  <input className="ref-text" value={r.label || ''} placeholder={t(lang, 'canvas.refLabel')} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, label: e.target.value } : x))} />
                  <input className="ref-color" type="color" value={r.color || '#F5803E'} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, color: e.target.value } : x))} />
                  {r.axis === 'y' && (
                    <input className="ref-val" type="number" value={r.value2 != null ? Number(r.value2.toFixed(3)) : ''} placeholder={t(lang, 'canvas.refBand')} onChange={(e) => setReferences((rs) => rs.map((x) => x.id === r.id ? { ...x, value2: e.target.value === '' ? undefined : Number(e.target.value) } : x))} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3>{t(lang, 'studio.s4')}</h3>
          <div className="field">
            <select value={themeId} onChange={(e) => onTheme(e.target.value)}>
              {THEME_LIST.map((th) => <option key={th.id} value={th.id}>{t(lang, 'theme.' + th.id)}</option>)}
              <option value="brand">{t(lang, 'theme.brand')}</option>
            </select>
          </div>
          {themeId === 'brand' && (
            <>
              <div className="row">
                <div className="field"><label>{t(lang, 'studio.primary')}</label><input value={accent} onChange={(e) => { setAccent(e.target.value); onTheme('brand'); }} /></div>
                <div className="field"><label>{t(lang, 'studio.secondary')}</label><input value={accent2} onChange={(e) => setAccent2(e.target.value)} /></div>
              </div>
              <div className="field"><label>{t(lang, 'studio.font')}</label><input value={font} onChange={(e) => setFont(e.target.value)} /></div>
              <div className="field">
                <label>{t(lang, 'studio.brandLabel')}</label>
                <div className="row">
                  <input value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} placeholder={t(lang, 'studio.brandPlaceholder')} />
                  <button className="btn btn-ghost" onClick={onBrandFetch}>{t(lang, 'studio.fetch')}</button>
                </div>
              </div>
              {contrastMsg && <div className="mini">{contrastMsg}</div>}
            </>
          )}

          <h3>{t(lang, 'studio.s5')}</h3>
          <div className="row">
            <button className="btn btn-primary" disabled={!bakedSvg} onClick={() => bakedSvg && downloadSVG(bakedSvg, 'chartforge.svg')}>{t(lang, 'studio.exportSvg')}</button>
            <button className="btn btn-ghost" disabled={!bakedSvg} onClick={() => bakedSvg && downloadPNG(bakedSvg, 'chartforge.png', 2)}>{t(lang, 'studio.exportPng')}</button>
          </div>
          <h3>{t(lang, 'studio.shareH')}</h3>
          <div className="col">
            <button className="btn btn-ghost" onClick={copyShare}>{t(lang, 'studio.share')}</button>
            {shareMsg && <div className="mini" style={{ wordBreak: 'break-all' }}>{shareMsg}</div>}
          </div>
        </div>

        <div>
          <div className="panel preview">
            {liveError ? <div className="err">⚠ {liveError}</div> : (
              <AnnotationLayer
                svg={bakedSvg}
                annotations={annotations}
                onChange={setAnnotations}
                addLabel={t(lang, 'studio.addCallout')}
                hintLabel={t(lang, 'studio.calloutHint')}
                textLabel={t(lang, 'studio.calloutText')}
                delLabel={t(lang, 'studio.calloutDel')}
                svgRef={chartRef}
                overlay={<ReferenceLayer chartRef={chartRef} plot={result.plot} references={references} onChange={setReferences} />}
              />
            )}
          </div>
          <div className="mini" style={{ marginTop: 10 }}>
            {t(lang, 'studio.tip')}
          </div>
        </div>
      </div>
    </div>
  );
}
