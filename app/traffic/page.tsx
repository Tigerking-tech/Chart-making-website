import type { Metadata } from 'next';
import { TrafficPanel } from '@/components/TrafficPanel';
import { getLang } from '@/lib/lang-server';

export const metadata: Metadata = {
  title: '来源归因面板 · Traffic Attribution',
  description: '本浏览器维度的访问来源归类（ChatGPT / Google / 直接访问等），纯本地统计、零上传。',
  robots: { index: false, follow: false },
};

export default function TrafficPage() {
  const lang = getLang();
  return <TrafficPanel lang={lang} />;
}
