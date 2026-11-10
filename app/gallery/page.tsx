import { CHART_TYPES, renderChart, samplesFor } from '@/lib/charts';
import { getLang } from '@/lib/lang-server';
import { t, tf, chartName, groupName } from '@/lib/i18n';
import { GalleryFilter, type GalleryGroup } from '@/components/GalleryFilter';

export const metadata = {
  title: '图型库 Gallery',
  description: `ChartForge 全部 ${CHART_TYPES.length} 种图型实时渲染：质量工具、基础图表、统计、架构/流程图、比较分析、分布分解、时间、实体建模、流量、体验、轴测与论文图表——编辑级矢量，团队品牌一致。`,
};

export default function GalleryPage({ searchParams }: { searchParams?: { theme?: string } }) {
  const lang = getLang();
  const themeId = searchParams?.theme || 'light';
  const S = samplesFor(lang);

  // 分组与数量直接由图型注册表计算，避免描述文案和实际图型数不同步。
  const groupCount = new Map<string, number>();
  CHART_TYPES.forEach((c) => groupCount.set(c.gk, (groupCount.get(c.gk) || 0) + 1));
  const groups: GalleryGroup[] = Array.from(groupCount, ([key, count]) => ({
    key, label: groupName(lang, key), count,
  }));

  return (
    <div className="container section">
      <h1 style={{ fontSize: 30, margin: '0 0 6px' }}>{t(lang, 'gallery.h1')}</h1>
      <p className="sub" style={{ color: 'var(--muted)', marginBottom: 28 }}>
        {tf(lang, 'gallery.sub', { t: themeId })}
      </p>
      <GalleryFilter lang={lang} groups={groups} total={CHART_TYPES.length} />
      <div className="gallery">
        {CHART_TYPES.map((c) => {
          const res = renderChart({
            type: c.id,
            csv: c.id === 'fishbone' ? '' : S[c.id],
            fishboneJson: c.id === 'fishbone' ? S.fishbone : undefined,
            title: chartName(lang, c.id),
            themeId,
            lang,
          });
          // 中英名称、原始分组名、id 与说明都进搜索索引。
          const searchText = [
            chartName(lang, c.id), c.label, c.group,
            groupName(lang, c.gk), c.id, String(t(lang, 'gallery.' + c.id)),
          ].join(' ');
          return (
            <div className="gitem" key={c.id} data-gk={c.gk} data-search={searchText}>
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
