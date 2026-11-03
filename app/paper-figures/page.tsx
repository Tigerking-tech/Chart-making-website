'use client';
import { useMemo, useState } from 'react';
import { renderChart } from '@/lib/charts';
import { PAPER_TEMPLATES, PAPER_CATS, type PaperTemplate } from '@/lib/paperTemplates';
import { encodeState } from '@/lib/shareState';

function blockFor(t: PaperTemplate) {
  const tr = t.extra?.trend;
  // Studio 是单图编辑器，其 hash 还原期望「扁平」结构（type/csv/title 直接在顶层），
  // 而非 CanvasStudio 的 { blocks:[...] } 多图结构。这里生成扁平结构以匹配。
  return {
    type: t.type,
    csv: t.csv,
    fish: '',
    title: t.title,
    themeId: 'light',
    accent: '#2F6FED',
    accent2: '#F5803E',
    font: "'Inter',Arial,sans-serif",
    usl: '',
    lsl: '',
    bins: 0,
    showTitle: t.showTitle ?? true,
    dataLabels: t.dataLabels ?? true,
    cumulative: true,
    legend: t.legend ?? 'none',
    annotations: [],
    references: [],
    gridMajor: true,
    trendShow: !!(tr && tr.show),
    trendType: (tr && tr.type) || 'linear',
    trendCi: !!(tr && tr.ci),
    errorBars: false,
    quartileBand: false,
  };
}

export default function PaperFiguresPage() {
  const [cat, setCat] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);

  const items = cat === 'all' ? PAPER_TEMPLATES : PAPER_TEMPLATES.filter((t) => t.category === cat);

  // 浏览器内用自研引擎实时渲染每个模板的 SVG 预览
  const previews = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of PAPER_TEMPLATES) {
      const r = renderChart({
        type: t.type,
        csv: t.csv,
        title: t.title,
        lang: t.lang ?? 'zh',
        showTitle: t.showTitle ?? true,
        dataLabels: t.dataLabels ?? true,
        legend: t.legend ?? 'none',
        ...(t.extra || {}),
      });
      map[t.id] = r.svg || `<div style="color:#e74c3c">${r.error || '渲染失败'}</div>`;
    }
    return map;
  }, []);

  function shareFor(t: PaperTemplate): string {
    const enc = encodeState(blockFor(t));
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    return '/studio' + qs + '#s=' + enc;
  }

  async function copyData(t: PaperTemplate) {
    try {
      await navigator.clipboard.writeText(t.csv);
      setCopied(t.id);
      setTimeout(() => setCopied((c) => (c === t.id ? null : c)), 1500);
    } catch {}
  }

  return (
    <div className="container section pf">
      <header className="pf-head">
        <div className="pf-badge">原创 · ChartForge 自研引擎</div>
        <h1>论文图表模板 · Built with ChartForge</h1>
        <p className="sub">
          以下所有图表均由 ChartForge <strong>自研 SVG 引擎从零绘制</strong>——算法与样式均为原创实现，
          复用项目内置的 base / overlays / stats 原语，<strong>不依赖任何第三方绘图库，也不复制任何外部脚本</strong>。
          涵盖分组柱状、堆叠柱状、误差折线、置信带折线、箱线图、小提琴图、山脊线、ECDF、棒棒糖图、散点拟合、雷达、热力图、气泡图、二维密度图、森林图、三维散点、华夫饼图、哑铃图、平行坐标、斜率图、南丁格尔玫瑰、蜂群图等论文高频图型。
        </p>
        <div className="pf-note">
          点击卡片右下「在 Studio 打开」可一键载入可编辑画布；「复制数据」可获取 CSV 自行改造。
        </div>
      </header>

      <div className="f4p-filters">
        {PAPER_CATS.map((c) => (
          <button key={c.key} className={'chip' + (cat === c.key ? ' chip-on' : '')} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="f4p-grid">
        {items.map((t) => (
          <article className="f4p-card" key={t.id}>
            <div className="f4p-thumb" dangerouslySetInnerHTML={{ __html: previews[t.id] || '' }} />
            <div className="f4p-meta">
              <span className="f4p-cat">{t.categoryLabel}</span>
              <h3>{t.title}</h3>
              <p className="pf-desc">{t.desc}</p>
              <div className="f4p-actions">
                <a className="btn-ghost sm" href={shareFor(t)} target="_blank" rel="noreferrer">在 Studio 打开 ↗</a>
                <button className="btn-ghost sm" onClick={() => copyData(t)}>
                  {copied === t.id ? '已复制 ✓' : '复制数据'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className="f4p-foot">
        本页图表与代码均为 <strong>ChartForge 原创实现</strong>，与「论文图集 / Figures for Papers」页（展示 Chen Liu 的
        CC BY-NC 4.0 第三方脚本）相互独立、互无代码复用。如将本页内容用于商业用途，无需向任何第三方申请授权。
      </footer>
    </div>
  );
}
