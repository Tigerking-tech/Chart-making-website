'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CHANNEL_LABEL, CHANNEL_ORDER, readRecords, clearRecords,
  type Attribution, type Channel,
} from '@/lib/attribution';
import type { Lang } from '@/lib/i18n';

const UI = {
  zh: {
    kicker: '站内诊断 · Attribution',
    h1: '来源归因面板',
    lead: '看看访问是从哪里来的。所有统计都在你的浏览器本地完成，不发送任何请求、不上传任何数据。',
    noticeTitle: '关于数据范围',
    notice: '这是「本机维度」的统计，只记录这台浏览器自己的访问，不能汇总全站访客。它用来验证 utm 标记是否正确、AI 推荐链接是否带来源参数、以及链路透传是否生效；要判断真实 SEO / AI 推荐效果，还需另接 Search Console 或服务端统计。',
    total: '累计访问', aiPct: 'AI 推荐占比', unmarked: '疑似未标记', channels: '渠道分布',
    channelsSub: '按首次进站来源归类；utm_source > referrer > 站内 > 直接访问。',
    recent: '最近访问记录', recentSub: '最多保留 300 条，仅存于本机 localStorage。',
    colTime: '时间', colChannel: '渠道', colUtm: 'utm_source', colRef: 'referrer', colPath: '页面',
    empty: '还没有记录。先在下面点几个自测链接，或直接访问工具页。',
    exportBtn: '导出 CSV', clearBtn: '清空记录', cleared: '已清空',
    selftestTitle: '自测：验证归类是否生效',
    selftestSub: '点下面的链接会用不同来源参数重新打开本页，刷新后即可在上方看到记录变化。',
    stChatgpt: '模拟 ChatGPT 推荐', stPerplexity: '模拟 Perplexity', stClaude: '模拟 Claude',
    stGoogle: '模拟 Google 搜索', stBing: '模拟 Bing', stDirect: '模拟直接访问',
    directHint: '（无 utm、无 referrer — 对应文章里说的「App 内点击不带标记」）',
    backTools: '← 返回工具中心',
    llms: '查看 llms.txt',
  },
  en: {
    kicker: 'Site diagnostics · Attribution',
    h1: 'Traffic Attribution Panel',
    lead: 'See where visits come from. Everything is computed locally in your browser — no network requests, no data upload.',
    noticeTitle: 'About data scope',
    notice: 'This is a per-browser view: it only records visits made by THIS browser, not site-wide traffic. Use it to verify that utm tags are correct, that AI-recommendation links carry source params, and that link passthrough works. Real SEO / AI-referral measurement still needs Search Console or server-side analytics.',
    total: 'Total visits', aiPct: 'AI referral share', unmarked: 'Possibly unmarked', channels: 'Channel breakdown',
    channelsSub: 'Classified by first-touch source: utm_source > referrer > internal > direct.',
    recent: 'Recent visits', recentSub: 'Up to 300 records, stored only in this browser localStorage.',
    colTime: 'Time', colChannel: 'Channel', colUtm: 'utm_source', colRef: 'referrer', colPath: 'Page',
    empty: 'No records yet. Click a self-test link below, or just visit a tool page.',
    exportBtn: 'Export CSV', clearBtn: 'Clear records', cleared: 'Cleared',
    selftestTitle: 'Self-test: verify classification',
    selftestSub: 'These links reopen this page with different source params. Refresh and watch the stats above change.',
    stChatgpt: 'Simulate ChatGPT', stPerplexity: 'Simulate Perplexity', stClaude: 'Simulate Claude',
    stGoogle: 'Simulate Google', stBing: 'Simulate Bing', stDirect: 'Simulate direct',
    directHint: '(no utm, no referrer — the "in-app tap without markers" case from the article)',
    backTools: '← Back to tools',
    llms: 'View llms.txt',
  },
};

const AI_CHANNELS: Channel[] = ['chatgpt', 'perplexity', 'claude', 'gemini'];
const SELFTEST: { key: keyof typeof UI.zh; q: string }[] = [
  { key: 'stChatgpt', q: '?utm_source=chatgpt.com&utm_medium=referral' },
  { key: 'stPerplexity', q: '?utm_source=perplexity.ai' },
  { key: 'stClaude', q: '?utm_source=claude.ai' },
  { key: 'stGoogle', q: '?utm_source=google&utm_medium=organic' },
  { key: 'stBing', q: '?utm_source=bing' },
  { key: 'stDirect', q: '?direct=1' },
];

export function TrafficPanel({ lang }: { lang: Lang }) {
  const u = UI[lang];
  const zh = lang === 'zh';
  const [records, setRecords] = useState<Attribution[]>([]);
  const [cleared, setCleared] = useState(false);

  useEffect(() => { setRecords(readRecords()); }, []);

  const stats = useMemo(() => {
    const counts = {} as Record<Channel, number>;
    for (const c of CHANNEL_ORDER) counts[c] = 0;
    for (const r of records) counts[r.channel] = (counts[r.channel] || 0) + 1;
    const ai = AI_CHANNELS.reduce((s, c) => s + (counts[c] || 0), 0);
    const unmarked = records.filter((r) => r.unmarked).length;
    const max = Math.max(1, ...CHANNEL_ORDER.map((c) => counts[c] || 0));
    return { counts, ai, unmarked, max, aiPct: records.length ? Math.round((ai / records.length) * 100) : 0 };
  }, [records]);

  function doClear() {
    clearRecords();
    setRecords([]);
    setCleared(true);
    setTimeout(() => setCleared(false), 1600);
  }

  function doExport() {
    const head = ['time', 'channel', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer_host', 'path', 'unmarked'];
    const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = records.map((r) => [
      new Date(r.ts).toISOString(), r.channel, r.utmSource, r.utmMedium, r.utmCampaign,
      r.referrerHost, r.path, r.unmarked ? 'yes' : '',
    ].map(esc).join(','));
    const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chartforge-attribution.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="tr-page">
        <div className="container">
          <div className="tr-head">
            <div className="seo-kicker"><span className="seo-kicker-ic">↗</span>{u.kicker}</div>
            <h1>{u.h1}</h1>
            <p className="tr-lead">{u.lead}</p>
          </div>

          <div className="tr-notice">
            <strong>ⓘ {u.noticeTitle}</strong>
            <p>{u.notice}</p>
            <div className="tr-notice-links">
              <Link href="/tools">{u.backTools}</Link> · <a href="/llms.txt" target="_blank" rel="noreferrer">{u.llms}</a>
            </div>
          </div>

          {/* 指标卡 */}
          <div className="tr-stats">
            <div className="tr-stat"><span className="tr-stat-n">{records.length}</span><span className="tr-stat-l">{u.total}</span></div>
            <div className="tr-stat"><span className="tr-stat-n">{stats.aiPct}%</span><span className="tr-stat-l">{u.aiPct}</span><span className="tr-stat-sub">{stats.ai} / {records.length || 1}</span></div>
            <div className="tr-stat"><span className="tr-stat-n">{stats.unmarked}</span><span className="tr-stat-l">{u.unmarked}</span></div>
          </div>

          {/* 渠道分布 */}
          <section className="tr-card">
            <div className="tr-card-head"><h2>{u.channels}</h2><p>{u.channelsSub}</p></div>
            <div className="tr-bars">
              {CHANNEL_ORDER.map((c) => {
                const n = stats.counts[c] || 0;
                const isAI = AI_CHANNELS.includes(c);
                return (
                  <div className="tr-bar-row" key={c}>
                    <span className="tr-bar-label">{CHANNEL_LABEL[c][lang]}</span>
                    <span className="tr-bar-track"><span className={'tr-bar-fill' + (isAI ? ' ai' : '') + (n ? '' : ' zero')} style={{ width: (n / stats.max * 100) + '%' }} /></span>
                    <span className={'tr-bar-n' + (n ? '' : ' zero')}>{n}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 自测链接 */}
          <section className="tr-card">
            <div className="tr-card-head"><h2>{u.selftestTitle}</h2><p>{u.selftestSub}</p></div>
            <div className="tr-selftest">
              {SELFTEST.map((s) => (
                <a key={s.key} className="tr-test-btn" href={'/traffic' + s.q}>{u[s.key] as string} ↗</a>
              ))}
            </div>
            <p className="tr-hint">{u.stDirect} {u.directHint}</p>
          </section>

          {/* 记录表 */}
          <section className="tr-card">
            <div className="tr-card-head tr-card-head-row">
              <div><h2>{u.recent}</h2><p>{u.recentSub}</p></div>
              <div className="tr-actions">
                <button type="button" className="btn btn-ghost sm" onClick={doExport} disabled={!records.length}>{u.exportBtn}</button>
                <button type="button" className="btn btn-ghost sm" onClick={doClear} disabled={!records.length}>{cleared ? u.cleared : u.clearBtn}</button>
              </div>
            </div>
            {records.length === 0 ? (
              <p className="tr-empty">{u.empty}</p>
            ) : (
              <div className="tr-table-wrap">
                <table className="tr-table">
                  <thead><tr>
                    <th>{u.colTime}</th><th>{u.colChannel}</th><th>{u.colUtm}</th>
                    <th>{u.colRef}</th><th>{u.colPath}</th>
                  </tr></thead>
                  <tbody>
                    {[...records].reverse().slice(0, 60).map((r, i) => (
                      <tr key={i}>
                        <td className="tr-mono">{new Date(r.ts).toLocaleString(zh ? 'zh-CN' : 'en-US', { hour12: false })}</td>
                        <td><span className={'tr-chip' + (AI_CHANNELS.includes(r.channel) ? ' ai' : '')}>{CHANNEL_LABEL[r.channel][lang]}</span>{r.unmarked && <span className="tr-unmarked" title="no utm / no referrer">?</span>}</td>
                        <td className="tr-mono">{r.utmSource || '—'}</td>
                        <td className="tr-mono">{r.referrerHost || '—'}</td>
                        <td className="tr-mono">{r.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
