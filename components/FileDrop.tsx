'use client';
import { useRef, useState } from 'react';
import { fileToCsv, isImportable } from '@/lib/fileImport';
import { Lang, t } from '@/lib/i18n';

/** 文件拖入 / 点击选择：把 CSV / Excel 解析为 CSV 文本回传 onCsv。 */
export function FileDrop({ lang, onCsv, hint }: {
  lang: Lang;
  onCsv: (csv: string) => void;
  hint: string;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    const file = files && files[0];
    if (!file) return;
    if (!isImportable(file.name)) {
      alert(t(lang, 'studio.importFail') + 'UNSUPPORTED');
      return;
    }
    try {
      const r = await fileToCsv(file);
      onCsv(r.csv);
    } catch (e: any) {
      alert(t(lang, 'studio.importFail') + (e?.message || e?.code || 'unknown'));
    }
  }

  return (
    <div
      className={'filedrop no-print' + (over ? ' over' : '')}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files)}
      />
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span className="filedrop-hint">{hint}</span>
    </div>
  );
}
