import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';

export const metadata = {
  title: '定价 Pricing',
  description: 'ChartForge 采用 Freemium：Free 带署名、Pro 去署名+矢量导出、Team 协作+品牌主题、Enterprise 私有化。',
};

const TIERS = [
  { tier: 'Free', amtKey: 'free', featured: false, itemsKey: 'pricing.free' },
  { tier: 'Pro', amtKey: 'pro', featured: true, itemsKey: 'pricing.pro' },
  { tier: 'Team', amtKey: 'team', featured: false, itemsKey: 'pricing.team' },
  { tier: 'Enterprise', amtKey: 'ent', featured: false, itemsKey: 'pricing.ent' },
];

export default function PricingPage() {
  const lang = getLang();
  return (
    <div className="container section">
      <h1 style={{ fontSize: 30, margin: '0 0 6px' }}>{t(lang, 'pricing.h1')}</h1>
      <p className="sub" style={{ color: 'var(--muted)', marginBottom: 28 }}>
        {t(lang, 'pricing.sub')}
      </p>
      <div className="price-grid">
        {TIERS.map((tr) => {
          const items: string[] = t(lang, tr.itemsKey);
          return (
            <div className={'price' + (tr.featured ? ' featured' : '')} key={tr.tier}>
              <div className="tier">{tr.tier}</div>
              <div className="amt">{t(lang, 'pricing.amt.' + tr.amtKey)}</div>
              <ul>
                {items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
