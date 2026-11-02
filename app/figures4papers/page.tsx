'use client';
import { useState } from 'react';
import { F4P_ITEMS, F4P_SOURCE, F4PItem } from '@/lib/f4pManifest';

const CATS = [
  { key: 'all', label: '全部' },
  { key: 'bar', label: '柱状 / 分组柱状' },
  { key: 'line', label: '折线 / 曲线' },
  { key: 'radar', label: '雷达图' },
  { key: 'heatmap', label: '热力图' },
  { key: 'scatter', label: '散点 / 流形' },
  { key: 'concept', label: '概念 / 示意图' },
  { key: 'other', label: '其他' },
];

export default function Figures4PapersPage() {
  const [cat, setCat] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [codeText, setCodeText] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const items = cat === 'all' ? F4P_ITEMS : F4P_ITEMS.filter((i) => i.category === cat);

  async function toggleCode(item: F4PItem) {
    if (!item.code) return;
    if (openId === item.id) { setOpenId(null); return; }
    if (!codeText[item.id]) {
      try {
        const res = await fetch(item.code);
        const txt = await res.text();
        setCodeText((s) => ({ ...s, [item.id]: txt }));
      } catch {
        setCodeText((s) => ({ ...s, [item.id]: '// 代码加载失败' }));
      }
    }
    setOpenId(item.id);
  }

  async function copyCode(item: F4PItem) {
    const txt = codeText[item.id] || '';
    try { await navigator.clipboard.writeText(txt); setCopied(item.id); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  return (
    <div className="container section f4p">
      <header className="f4p-head">
        <h1>论文图表范例 · Figures for Papers</h1>
        <p className="sub">
          精选自 <a href={F4P_SOURCE.repo} target="_blank" rel="noreferrer">Chen Liu (Yale)</a> 的论文级出图脚本合集，
          涵盖柱状 / 分组柱状、折线曲线、雷达、热力图、散点流形、概念示意图等。点开即可查看并复制原版 Python（matplotlib）代码。
        </p>
        <div className="f4p-license">
          <strong>来源与许可：</strong>
          作者 {F4P_SOURCE.author}；许可 <span className="badge-lic">{F4P_SOURCE.license}</span>。
          {F4P_SOURCE.note}
        </div>
      </header>

      <div className="f4p-filters">
        {CATS.map((c) => (
          <button key={c.key} className={'chip' + (cat === c.key ? ' chip-on' : '')} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="f4p-grid">
        {items.map((item) => (
          <article className="f4p-card" key={item.id}>
            <div className="f4p-thumb">
              {item.image
                ? <img src={item.image} alt={item.title} loading="lazy" />
                : <div className="f4p-nothumb">概念图 / 无缩略</div>}
            </div>
            <div className="f4p-meta">
              <span className="f4p-cat">{item.categoryLabel}</span>
              <h3>{item.title}</h3>
              <div className="f4p-actions">
                {item.code && (
                  <button className="btn-ghost sm" onClick={() => toggleCode(item)}>
                    {openId === item.id ? '收起代码' : '查看原代码'}
                  </button>
                )}
                <a className="btn-ghost sm" href={item.repo} target="_blank" rel="noreferrer">原仓库 ↗</a>
              </div>
              {openId === item.id && item.code && (
                <div className="f4p-code">
                  <div className="f4p-code-bar">
                    <span>{item.code.split('/').pop()}</span>
                    <button className="btn-ghost xs" onClick={() => copyCode(item)}>
                      {copied === item.id ? '已复制 ✓' : '复制'}
                    </button>
                  </div>
                  <pre><code>{codeText[item.id]}</code></pre>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <footer className="f4p-foot">
        本页所有图表脚本与图片版权归原作者 <strong>{F4P_SOURCE.author}</strong> 所有，依据
        {' '}{F4P_SOURCE.license} 集成展示。如需商业使用，请联系作者获取授权。
      </footer>
    </div>
  );
}
