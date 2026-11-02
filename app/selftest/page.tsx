'use client';
import { useEffect, useState } from 'react';
import { CHART_TYPES, SAMPLES, renderChart } from '@/lib/charts';

// 客户端自检页：在浏览器里用 light 与 hand 两套主题渲染全部图型，供截图核对。
// 用客户端渲染避免构建期静态生成 22 张图导致 OOM。
export default function SelfTestPage() {
  const [light, setLight] = useState<Record<string, string>>({});
  const [hand, setHand] = useState<Record<string, string>>({});

  useEffect(() => {
    const L: Record<string, string> = {};
    const H: Record<string, string> = {};
    for (const c of CHART_TYPES) {
      const base = {
        type: c.id as any,
        csv: c.id === 'fishbone' ? '' : SAMPLES[c.id],
        fishboneJson: c.id === 'fishbone' ? SAMPLES.fishbone : undefined,
        title: c.label,
      };
      L[c.id] = renderChart({ ...base, themeId: 'light' }).svg || '';
      H[c.id] = renderChart({ ...base, themeId: 'hand' }).svg || '';
    }
    setLight(L);
    setHand(H);
  }, []);

  const block = (title: string, data: Record<string, string>) => (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 22 }}>主题：{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {CHART_TYPES.map((c) => (
          <div key={c.id + title} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, minHeight: 120 }}>
            <div dangerouslySetInnerHTML={{ __html: data[c.id] || '<div style="color:#999">loading…</div>' }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      {block('light', light)}
      {block('hand', hand)}
    </div>
  );
}
