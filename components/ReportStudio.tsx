'use client';
import { useMemo, useState } from 'react';
import { renderChart } from '@/lib/charts';
import { iMR } from '@/lib/engine/stats/stats.js';
import { capability } from '@/lib/engine/charts/spc.js';
import { downloadSVG } from '@/lib/engine/export/exporter.js';
import { ChartView } from './ChartView';
import { Lang, t } from '@/lib/i18n';

const SAMPLE = `10.02
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
10.04
9.95
10.01
10.03
9.97
10.00
10.02
9.98
10.04
9.99
10.01`;

const STD_KEYS = ['gen', 'iso', 'iatf', 'ppap'] as const;

interface Diag {
  vals: number[];
  status: 'ok' | 'warn' | 'bad';
  verdictKey: string;
  cp: number | null;
  cpk: number | null;
  mean: number;
  sigma: number;
  n: number;
  messages: { point: number; rule: string; level: 'bad' | 'warn' }[];
  imrSvg: string;
  capSvg: string;
}

function verdictKeyOf(cpk: number | null): string {
  if (cpk == null) return 'need';
  if (cpk >= 1.67) return 'excellent';
  if (cpk >= 1.33) return 'adequate';
  if (cpk >= 1.0) return 'marginal';
  return 'inadequate';
}

function buildDiagnosis(data: string, usl: string, lsl: string, lang: Lang): Diag | { error: string } {
  const vals = data
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));
  if (vals.length < 8) return { error: 'report.dataMin' };

  const imr = iMR(vals);
  const u = usl.trim() ? Number(usl) : null;
  const l = lsl.trim() ? Number(lsl) : null;
  const cap = capability(vals, u, l);

  const messages: Diag['messages'] = [];
  imr.flags.forEach((fl, i) => {
    fl.forEach((code) => {
      const level = code === 'R1' ? 'bad' : 'warn';
      messages.push({ point: i + 1, rule: code, level });
    });
  });

  const hasBad = messages.some((m) => m.level === 'bad');
  const hasWarn = messages.some((m) => m.level === 'warn');
  const status: Diag['status'] = hasBad ? 'bad' : hasWarn ? 'warn' : 'ok';

  const csv = '测量值\n' + vals.join('\n');
  const imrSvg = renderChart({ type: 'control', csv, title: t(lang, 'report.imrTitle'), themeId: 'light', lang }).svg || '';
  const capSvg = renderChart({
    type: 'capability', csv, title: t(lang, 'report.capTitle'), usl: u, lsl: l, themeId: 'light', w: 720, h: 300, lang,
  }).svg || '';

  return {
    vals, status, verdictKey: verdictKeyOf(cap.cpk), cp: cap.cp, cpk: cap.cpk,
    mean: cap.mean, sigma: cap.sigma, n: vals.length, messages, imrSvg, capSvg,
  };
}

export function ReportStudio({ lang }: { lang: Lang }) {
  const [data, setData] = useState<string>(SAMPLE);
  const [usl, setUsl] = useState<string>('10.10');
  const [lsl, setLsl] = useState<string>('9.90');
  const [stdKey, setStdKey] = useState<string>('iso');
  const [diag, setDiag] = useState<Diag | null>(null);
  const [error, setError] = useState<string>('');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const stdLabel = t(lang, 'report.std.' + stdKey);

  function generate() {
    const r = buildDiagnosis(data, usl, lsl, lang);
    if ('error' in r) { setError(r.error); setDiag(null); return; }
    setError(''); setDiag(r);
  }

  function adviceKey(d: Diag): string {
    if (d.status === 'bad') return 'bad';
    if (d.status === 'warn') return 'warn';
    if (d.cpk != null && d.cpk < 1.0) return 'low';
    if (d.cpk != null && d.cpk < 1.33) return 'edge';
    return 'ok';
  }

  return (
    <div className="container">
      <div className="report-studio">
        <div className="panel">
          <h3>{t(lang, 'report.s1')}</h3>
          <div className="field">
            <label>{t(lang, 'report.measureLabel')}</label>
            <textarea value={data} onChange={(e) => setData(e.target.value)} style={{ minHeight: 200 }} />
          </div>

          <h3>{t(lang, 'report.s2')}</h3>
          <div className="row">
            <div className="field"><label>{t(lang, 'report.usl')}</label><input value={usl} onChange={(e) => setUsl(e.target.value)} placeholder={t(lang, 'report.uslPh')} /></div>
            <div className="field"><label>{t(lang, 'report.lsl')}</label><input value={lsl} onChange={(e) => setLsl(e.target.value)} placeholder={t(lang, 'report.uslPh')} /></div>
          </div>

          <h3>{t(lang, 'report.s3')}</h3>
          <div className="field">
            <select value={stdKey} onChange={(e) => setStdKey(e.target.value)}>
              {STD_KEYS.map((k) => <option key={k} value={k}>{t(lang, 'report.std.' + k)}</option>)}
            </select>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={generate}>{t(lang, 'report.gen')}</button>
            <button className="btn btn-ghost" onClick={() => { setData(SAMPLE); setUsl('10.10'); setLsl('9.90'); }}>{t(lang, 'report.loadSample')}</button>
          </div>
          <div className="mini" style={{ marginTop: 10 }}>{t(lang, 'report.mini')}</div>
        </div>

        <div>
          {error && <div className="err">⚠ {t(lang, error)}</div>}
          {!diag && !error && (
            <div className="preview" style={{ minHeight: 480 }}>
              {t(lang, 'report.empty').split('\n').map((line, i) => (
                <span className="mini" key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </div>
          )}

          {diag && (
            <div className="report" id="report-doc">
              <div className="report-head">
                <div>
                  <h2>{t(lang, 'report.title')}</h2>
                  <div className="meta">{t(lang, 'report.meta')
                    .replace('{n}', String(diag.n))
                    .replace('{m}', diag.mean.toFixed(4))
                    .replace('{s}', diag.sigma.toFixed(4))
                    .replace('{d}', today)}</div>
                </div>
                <div className="std">{stdLabel}</div>
              </div>

              <div className="verdict" style={{ borderColor: diag.status === 'bad' ? '#f1b0b0' : diag.status === 'warn' ? '#f0c98a' : '#a9dcba' }}>
                <span className={`badge ${diag.status}`}>{t(lang, 'report.status.' + diag.status)}</span>
                <div className="score">
                  {diag.cpk != null ? diag.cpk.toFixed(2) : '—'}
                  <small>{diag.cpk != null ? 'Cpk · ' + t(lang, 'report.verdict.' + diag.verdictKey) : t(lang, 'report.cpkNeeds')}</small>
                </div>
              </div>

              <div className="kv">
                <div className="cell"><div className="k">{t(lang, 'report.kvN')}</div><div className="v">{diag.n}</div></div>
                <div className="cell"><div className="k">{t(lang, 'report.kvMean')}</div><div className="v">{diag.mean.toFixed(3)}</div></div>
                <div className="cell"><div className="k">{t(lang, 'report.kvSigma')}</div><div className="v">{diag.sigma.toFixed(3)}</div></div>
                <div className="cell"><div className="k">{t(lang, 'report.kvCp')}</div><div className="v">{diag.cp != null ? diag.cp.toFixed(2) : '—'}</div></div>
              </div>

              <div className="diag">
                <h4>{t(lang, 'report.diagH')}</h4>
                <p style={{ margin: '0 0 4px' }}>
                  {diag.status === 'bad'
                    ? t(lang, 'report.badIntro')
                    : diag.status === 'warn'
                      ? t(lang, 'report.warnIntro')
                      : t(lang, 'report.okIntro')}
                </p>
                {diag.messages.length > 0 ? (
                  <ul>
                    {diag.messages.map((m, i) => (
                      <li key={i} className={m.level}>
                        {lang === 'zh'
                          ? `第 ${m.point} 点 → ${m.rule}：${t(lang, 'report.rule.' + m.rule)}`
                          : `Point ${m.point} → ${m.rule}: ${t(lang, 'report.rule.' + m.rule)}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: '#1e7a3c' }}>{t(lang, 'report.stable')}</p>
                )}
                <p style={{ margin: '10px 0 0' }}>{t(lang, 'report.advice.' + adviceKey(diag))}</p>
              </div>

              <div className="report-charts">
                <div className="rc">
                  <div className="cap">{t(lang, 'report.fig1')}</div>
                  {diag.imrSvg ? <ChartView svg={diag.imrSvg} /> : <span className="mini">{t(lang, 'report.mini')}</span>}
                </div>
                <div className="rc">
                  <div className="cap">{t(lang, 'report.fig2')}</div>
                  {diag.capSvg ? <ChartView svg={diag.capSvg} /> : <span className="mini">{t(lang, 'report.mini')}</span>}
                </div>
              </div>

              <div className="report-actions">
                <button className="btn btn-ghost" onClick={() => diag.imrSvg && downloadSVG(diag.imrSvg, 'chartforge-imr.svg')}>{t(lang, 'report.expImr')}</button>
                <button className="btn btn-ghost" onClick={() => diag.capSvg && downloadSVG(diag.capSvg, 'chartforge-capability.svg')}>{t(lang, 'report.expCap')}</button>
                <button className="btn btn-ghost" onClick={() => window.print()}>{t(lang, 'report.print')}</button>
              </div>

              <div className="signoff">
                <div className="so"><div className="k">{t(lang, 'report.prep')}</div><div className="line" /></div>
                <div className="so"><div className="k">{t(lang, 'report.rev')}</div><div className="line" /></div>
                <div className="so"><div className="k">{t(lang, 'report.appr')}</div><div className="line" /></div>
                <div className="so"><div className="k">{t(lang, 'report.date')}</div><div className="line" />{today}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
