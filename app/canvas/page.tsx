import { CanvasStudio } from '@/components/CanvasStudio';
import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';

export const metadata = {
  title: '品牌画布 · 报告工作台',
  description: '把多张 QC 图放进同一份带公司品牌的报告，一键导出 PDF / PPTX 直接递交审核。',
};

export default function CanvasPage() {
  const lang = getLang();
  return (
    <>
      <div className="container" style={{ paddingTop: 24 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>{t(lang, 'canvas.title')}</h1>
        <p className="mini" style={{ marginTop: 0 }}>{t(lang, 'canvas.sub')}</p>
      </div>
      <CanvasStudio lang={lang} />
    </>
  );
}
