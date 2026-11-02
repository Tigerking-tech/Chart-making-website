import { Studio } from '@/components/Studio';
import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';

export const metadata = {
  title: '作图 Studio',
  description: '贴数据 → 自动选图 → 自动算统计 → 导出编辑级矢量图。柏拉图、控制图、鱼骨图、散布图等。',
};

export default function StudioPage() {
  const lang = getLang();
  return (
    <>
      <div className="container" style={{ paddingTop: 24 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>{t(lang, 'studio.title')}</h1>
        <p className="mini" style={{ marginTop: 0 }}>{t(lang, 'studio.sub')}</p>
      </div>
      <Studio lang={lang} />
    </>
  );
}
