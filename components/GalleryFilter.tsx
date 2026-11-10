'use client';
import { useEffect, useState } from 'react';
import type { Lang } from '@/lib/i18n';

export interface GalleryGroup {
  key: string;
  label: string;
  count: number;
}

/**
 * 图型库的搜索 / 分类控制条。
 * 图型卡片本身由服务端预渲染（SEO 完整、SVG 不进入客户端 payload），
 * 这里只按 data-* 属性切换可见性，避免把 78 张 SVG 序列化两次。
 */
export function GalleryFilter({
  lang, groups, total,
}: {
  lang: Lang;
  groups: GalleryGroup[];
  total: number;
}) {
  const [q, setQ] = useState('');
  const [gk, setGk] = useState('all');
  const [shown, setShown] = useState(total);

  useEffect(() => {
    const kw = q.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll<HTMLElement>('.gitem[data-gk]').forEach((el) => {
      const hit =
        (!kw || (el.dataset.search || '').toLowerCase().includes(kw)) &&
        (gk === 'all' || el.dataset.gk === gk);
      el.hidden = !hit;
      el.style.display = hit ? '' : 'none';
      if (hit) n += 1;
    });
    setShown(n);
  }, [q, gk]);

  const zh = lang === 'zh';

  return (
    <div className="gallery-toolbar">
      <div className="gallery-searchrow">
        <input
          className="gallery-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={zh
            ? '搜索图型名称或用途，如「柏拉图」「Pareto」「质量」…'
            : 'Search chart types, e.g. "Pareto", "SPC", "box plot"…'}
          aria-label={zh ? '搜索图型' : 'Search chart types'}
        />
        <span className="gallery-count" aria-live="polite">{shown} / {total}</span>
      </div>
      <div className="gallery-tabs" role="tablist" aria-label={zh ? '图型分类' : 'Chart categories'}>
        <button
          type="button" role="tab" aria-selected={gk === 'all'}
          className={'chip' + (gk === 'all' ? ' chip-on' : '')}
          onClick={() => setGk('all')}
        >
          {zh ? '全部' : 'All'}<span className="chip-num">{total}</span>
        </button>
        {groups.map((g) => (
          <button
            key={g.key} type="button" role="tab" aria-selected={gk === g.key}
            className={'chip' + (gk === g.key ? ' chip-on' : '')}
            onClick={() => setGk(g.key)}
          >
            {g.label}<span className="chip-num">{g.count}</span>
          </button>
        ))}
      </div>
      {shown === 0 && (
        <p className="gallery-empty">
          {zh ? '没有匹配的图型，换个关键词或分类试试。' : 'No matching chart. Try another keyword or category.'}
        </p>
      )}
    </div>
  );
}
