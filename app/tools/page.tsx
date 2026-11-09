import type { Metadata } from 'next';
import { ToolsHubClient } from '@/components/ToolsHubClient';
import { getLang } from '@/lib/lang-server';
import { SITE_NAME_FULL, abs } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Free SPC & Quality Tools — 20 Online Calculators & Chart Makers',
  description: '20 free online SPC and quality tools: control chart maker, Cpk calculator, X̄-R / I-MR, p/np/c/u charts, Gage R&R, Pareto, fishbone, Western Electric & Nelson rule checkers. No install, no sign-up, vector export.',
  alternates: { canonical: abs('/tools') },
  openGraph: { type: 'website', url: abs('/tools'), siteName: SITE_NAME_FULL, title: 'Free SPC & Quality Tools — ChartForge', description: '20 free browser-based SPC calculators and chart makers.' },
};

export default function ToolsHubPage() {
  const lang = getLang();
  return <ToolsHubClient lang={lang} />;
}
