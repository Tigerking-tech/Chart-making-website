// lib/fileImport.ts — 客户端文件导入。
// CSV/TXT 直接读文本；XLSX/XLS 仅在文件拖入时动态加载 xlsx，避免污染首屏 bundle。
// 输出为「首行为表头」的逗号分隔文本，直接喂给引擎 parseTable。

export interface ImportResult {
  csv: string;        // 归一化后的逗号分隔文本
  sheetName?: string; // 仅 Excel 有
  rows: number;
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/** 判断文件是否可被导入。 */
export function isImportable(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.endsWith('.csv') || n.endsWith('.txt') || n.endsWith('.tsv') ||
    n.endsWith('.xlsx') || n.endsWith('.xls');
}

/** 读取文件并转换为 CSV 文本。失败抛出带 code 的错误。 */
export async function fileToCsv(file: File): Promise<ImportResult> {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) {
    const text = await file.text();
    const csv = normalize(text);
    return { csv, rows: csv ? csv.split('\n').length : 0 };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    // 动态加载：xlsx 体积较大，仅在真正需要时才进 bundle。
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw { code: 'EMPTY', message: 'EMPTY' };
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',' });
    const normalized = normalize(csv);
    return { csv: normalized, sheetName, rows: normalized ? normalized.split('\n').length : 0 };
  }
  throw { code: 'UNSUPPORTED', message: 'UNSUPPORTED' };
}
