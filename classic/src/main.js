// ===========================================================================
// main.js — 应用主逻辑：绑定 UI、串联解析/统计/渲染/导出
// ===========================================================================
import { THEMES, makeBrandTheme } from './themes/themes.js';
import { parseTable } from './data/parser.js';
import { recommend, buildPayload } from './data/recommend.js';
import { renderPareto } from './charts/pareto.js';
import { renderBar } from './charts/bar.js';
import { renderScatter } from './charts/scatter.js';
import { renderHistogram } from './charts/histogram.js';
import { renderControl } from './charts/controlChart.js';
import { renderLine } from './charts/line.js';
import { renderFishbone } from './charts/fishbone.js';
import { downloadSVG, downloadPNG, mountSVG } from './export/exporter.js';
import { checkContrast, fetchBrandFromUrl } from './themes/brand.js';

// 每种图表的示例数据
const SAMPLES = {
  pareto: `不良项目,频数
虚焊,42
漏件,25
偏移,15
少锡,10
其他,8`,
  bar: `区域,销量
华东,320
华南,280
华北,210
西部,150
东北,90`,
  scatter: `湿度,虚焊率
30,1.2
35,1.5
40,2.0
45,2.4
50,3.1
55,3.6
60,4.5
65,5.0
70,5.8`,
  histogram: `厚度
10.02
10.05
9.98
10.01
10.03
9.97
10.00
10.04
9.99
10.02
10.06
9.96
10.01
10.03
9.98
10.00
10.05
9.99
10.02
10.04`,
  control: `测量值
10.02
10.05
9.98
10.01
10.03
9.97
10.00
10.04
9.99
10.02
10.06
9.96
10.01
10.03
9.98
10.00
10.05
9.99
10.02
10.04`,
  line: `月份,销售额
1,120
2,135
3,148
4,160
5,155
6,172
7,180
8,176
9,190
10,205`,
  fishbone: `{
  "effect": "焊接不良率偏高",
  "bones": [
    {"category": "人", "causes": ["培训不足", "疲劳作业"]},
    {"category": "机", "causes": ["烙铁温度漂移", "夹具磨损"]},
    {"category": "料", "causes": ["焊锡含杂质", "PCB 氧化"]},
    {"category": "法", "causes": ["参数设置错误", "工艺文件缺失"]},
    {"category": "环", "causes": ["湿度偏高", "静电干扰"]},
    {"category": "测", "causes": ["量具未校准", "抽检方案不当"]}
  ]
}`,
};

const $ = (id) => document.getElementById(id);
let lastSVG = '';

function getTheme() {
  const id = $('themeSelect').value;
  if (id === 'brand') {
    return makeBrandTheme({
      accent: $('accentInput').value,
      accent2: $('accent2Input').value,
      font: $('fontSelect').value,
      name: '品牌 Brand',
    });
  }
  return THEMES[id] || THEMES.light;
}

function numOrNull(v) {
  const t = (v || '').trim();
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}

function render() {
  const type = $('chartType').value;
  const theme = getTheme();
  const host = $('chartHost');
  const err = $('errMsg');
  err.textContent = '';
  try {
    let svg = '';
    if (type === 'fishbone') {
      const data = JSON.parse($('fishInput').value || '{}');
      svg = renderFishbone(data, theme, { title: $('titleInput').value || '鱼骨图 Fishbone' });
    } else {
      const table = parseTable($('csvInput').value);
      if (!table.columns.length) throw new Error('请先输入数据（CSV，首行表头）');
      const payload = buildPayload(table, type);
      const title = $('titleInput').value;
      const usl = numOrNull($('uslInput').value);
      const lsl = numOrNull($('lslInput').value);
      const bins = numOrNull($('binsInput').value) || 0;
      const opts = { title, subtitle: '', usl, lsl, bins };
      if (type === 'pareto') svg = renderPareto(payload, theme, opts);
      else if (type === 'bar') svg = renderBar(payload, theme, opts);
      else if (type === 'scatter') svg = renderScatter(payload.xs, payload.ys, theme, { ...opts, xLabel: payload.xLabel, yLabel: payload.yLabel });
      else if (type === 'histogram') svg = renderHistogram(payload.values, theme, opts);
      else if (type === 'control') svg = renderControl(payload.values, theme, opts);
      else if (type === 'line') svg = renderLine(payload.points, theme, opts);
    }
    mountSVG(host, svg);
    lastSVG = svg;
  } catch (e) {
    err.textContent = '⚠ ' + e.message;
    lastSVG = '';
  }
}

function toggleInputs() {
  const isFish = $('chartType').value === 'fishbone';
  $('fishInputWrap').classList.toggle('hidden', !isFish);
  $('csvInput').closest('.block').querySelector('textarea#csvInput').classList.toggle('hidden', isFish);
}

function loadSample() {
  const type = $('chartType').value;
  if (type === 'fishbone') $('fishInput').value = SAMPLES.fishbone;
  else $('csvInput').value = SAMPLES[type];
  render();
}

function updateContrast() {
  const r = checkContrast($('accentInput').value);
  $('contrastMsg').textContent = `对比度 ${r.ratio} · ${r.message}`;
}

// ---- 事件绑定 ----
$('chartType').addEventListener('change', () => { toggleInputs(); render(); });
$('themeSelect').addEventListener('change', () => {
  $('brandWrap').classList.toggle('hidden', $('themeSelect').value !== 'brand');
  if ($('themeSelect').value === 'brand') updateContrast();
  render();
});
['csvInput', 'fishInput', 'titleInput', 'uslInput', 'lslInput', 'binsInput'].forEach((id) =>
  $(id).addEventListener('input', render));
['accentInput', 'accent2Input', 'fontSelect'].forEach((id) =>
  $(id).addEventListener('input', () => { if ($('themeSelect').value === 'brand') { updateContrast(); render(); } }));

$('sampleBtn').addEventListener('click', loadSample);
$('clearBtn').addEventListener('click', () => {
  $('csvInput').value = ''; $('fishInput').value = ''; render();
});
$('autoBtn').addEventListener('click', () => {
  const table = parseTable($('csvInput').value);
  if (!table.columns.length) { $('errMsg').textContent = '⚠ 请先输入数据再智能推荐'; return; }
  const r = recommend(table);
  $('chartType').value = r.type;
  toggleInputs();
  $('recoMsg').textContent = '⚡ 推荐：' + r.reason;
  render();
});
$('recoMsg') && $('recoMsg').addEventListener('click', () => { $('recoMsg').textContent = ''; });

$('svgBtn').addEventListener('click', () => { if (lastSVG) downloadSVG(lastSVG, 'chartforge.svg'); });
$('pngBtn').addEventListener('click', () => { if (lastSVG) downloadPNG(lastSVG, 'chartforge.png', 2); });

$('brandUrlBtn').addEventListener('click', async () => {
  const url = $('brandUrlInput').value.trim();
  if (!url) return;
  try {
    const b = await fetchBrandFromUrl(url);
    if (b.accent) $('accentInput').value = b.accent;
    if (b.accent2) $('accent2Input').value = b.accent2;
    if (b.font) $('fontSelect').value = b.font;
    updateContrast(); render();
  } catch (e) {
    $('contrastMsg').textContent = '抓取失败：' + e.message;
  }
});

// 初始化
$('csvInput').value = SAMPLES.pareto;
loadSample();
