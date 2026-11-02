import { CHART_TYPES, renderChart, samplesFor } from '@/lib/charts';
import { getLang } from '@/lib/lang-server';
import { t, tf, chartName, groupName } from '@/lib/i18n';

export const metadata = {
  title: '图型库 Gallery',
  description: 'ChartForge 全部图型实时渲染：质量工具、基础图表、统计、架构/流程图、比较分析、分布分解、时间、实体建模、流量、体验与轴测——编辑级矢量，团队品牌一致（共 58 种）。',
};

export default function GalleryPage({ searchParams }: { searchParams?: { theme?: string } }) {
  const lang = getLang();
  const themeId = searchParams?.theme || 'light';
  return (
    <div className="container section">
      <h1 style={{ fontSize: 30, margin: '0 0 6px' }}>{t(lang, 'gallery.h1')}</h1>
      <p className="sub" style={{ color: 'var(--muted)', marginBottom: 28 }}>
        {tf(lang, 'gallery.sub', { t: themeId })}
      </p>
      <div className="gallery">
        {CHART_TYPES.map((c) => {
          const S = samplesFor(lang);
          const res = renderChart({
            type: c.id,
            csv: c.id === 'fishbone' ? '' : S[c.id],
            fishboneJson: c.id === 'fishbone' ? S.fishbone : undefined,
            title: chartName(lang, c.id),
            themeId,
            lang,
          });
          return (
            <div className="gitem" key={c.id}>
              <h4>{chartName(lang, c.id)} · {groupName(lang, c.gk)}</h4>
              <div dangerouslySetInnerHTML={{ __html: res.svg || `<div class="err">${res.error || ''}</div>` }} />
              <p className="mini" style={{ marginTop: 8 }}>{t(lang, 'gallery.' + c.id)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
