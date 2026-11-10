import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { SourceTracker } from '@/components/SourceTracker';
import { getLang } from '@/lib/lang-server';
import { SITE_URL, SITE_NAME, SITE_NAME_FULL } from '@/lib/site';

const SITE = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'ChartForge · 图表工坊 — 正确、好看、可直接进 PPT 的图表 SaaS',
    template: '%s · ChartForge',
  },
  description:
    '面向质量/运营/数据人群的 Web 图表工坊：贴数据→自动选图→自动算统计并给结论→导出编辑级矢量图。柏拉图、控制图、鱼骨图、散布图，团队视觉品牌一致。',
  keywords: [
    'Pareto chart maker', 'control chart maker', 'Cpk calculator', 'process capability calculator',
    'Xbar R chart', 'I-MR chart', 'histogram maker', 'fishbone diagram maker', 'Gage R&R calculator',
    'free SPC software', 'p chart', 'np chart', 'c chart', 'u chart', 'Western Electric rules',
    'Nelson rules', 'run chart maker', 'scatter plot maker', 'box plot maker', 'Minitab alternative',
    '直方图', '散布图', '柏拉图', '管制图', '鱼骨图', 'quality chart tool', '图表生成器',
  ],
  authors: [{ name: 'ChartForge' }],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE,
    siteName: 'ChartForge',
    title: 'ChartForge · 图表工坊',
    description: '贴数据→自动选图→自动算统计→导出编辑级矢量图。质量与统计图表，团队品牌一致。',
  },
  twitter: { card: 'summary_large_image', title: 'ChartForge · 图表工坊', description: '正确、好看、可直接进 PPT 的图表 SaaS。' },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME_FULL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description:
        'Web 图表工坊：自动选图、自动统计（控制限/Cp/Cpk/回归）、导出编辑级矢量 SVG/PNG，团队品牌一致。',
      url: SITE,
    },
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE,
      potentialAction: {
        '@type': 'SearchAction',
        target: SITE + '/tools?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang === 'en' ? 'en' : 'zh-CN'}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <SourceTracker />
        <Nav lang={lang} />
        <main>{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
