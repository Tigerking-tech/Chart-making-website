import { ReportStudio } from '@/components/ReportStudio';
import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';

export const metadata = {
  title: 'SPC 诊断 / QC 报告',
  description: '粘贴测量数据 → 自动判定受控状态与 Western Electric 判异、给出 Cpk 评级与改善建议，一键生成可签字归档的 ISO 9001 / IATF 16949 过程质量报告。',
};

export default function ReportPage() {
  const lang = getLang();
  return (
    <>
      <div className="container" style={{ paddingTop: 24 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>{t(lang, 'reportPage.title')}</h1>
        <p className="mini" style={{ marginTop: 0 }}>{t(lang, 'reportPage.sub')}</p>
      </div>
      <ReportStudio lang={lang} />
    </>
  );
}
