// 数据解析：把用户输入（CSV / 制表符 / 逗号）解析成带类型推断的表结构
export function parseRows(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l) => l.split(/[,\t]/).map((c) => c.trim()));
}

function isNumeric(str) {
  if (str === '' || str == null) return false;
  return !isNaN(Number(str)) && isFinite(Number(str));
}

/** 解析为表：自动判断是否首行为表头。 */
export function parseTable(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return { headers: [], columns: [] };
  const firstIsHeader = rows[0].some((c) => !isNumeric(c));
  const headers = firstIsHeader ? rows[0] : rows[0].map((_, i) => '列' + (i + 1));
  const dataRows = firstIsHeader ? rows.slice(1) : rows;

  const colCount = headers.length;
  const columns = headers.map((name, ci) => {
    const raw = dataRows.map((r) => r[ci] ?? '');
    const numeric = raw.length > 0 && raw.every((v) => isNumeric(v));
    return {
      name,
      type: numeric ? 'numeric' : 'categorical',
      values: numeric ? raw.map(Number) : raw,
    };
  });
  return { headers, columns };
}

export function numericColumns(table) { return table.columns.filter((c) => c.type === 'numeric'); }
export function categoricalColumns(table) { return table.columns.filter((c) => c.type === 'categorical'); }
