// ===========================================================================
// themes.js — 主题系统
// 所有图表只用"语义 token"（paper/ink/muted/accent/accent2/grid/gridText/font），
// 主题切换 = 只换 token 映射。这是"视觉一致 / 品牌一致"的底层机制。
// ===========================================================================

export const THEMES = {
  light: {
    id: 'light', name: '浅色 Light',
    paper: '#ffffff', ink: '#1f2430', muted: '#6b7280',
    accent: '#2F6FED', accent2: '#F5803E', grid: '#EAECEF', gridText: '#9aa0a6',
    font: "'Inter','Helvetica Neue',Arial,sans-serif",
  },
  dark: {
    id: 'dark', name: '深色 Dark',
    paper: '#0f1115', ink: '#e8eaed', muted: '#9aa0a6',
    accent: '#5B8DEF', accent2: '#FF9F45', grid: '#2a2f3a', gridText: '#6b7280',
    font: "'Inter','Helvetica Neue',Arial,sans-serif",
  },
  academic: {
    id: 'academic', name: '学术 Academic',
    paper: '#fbfaf7', ink: '#2b2b2b', muted: '#767676',
    accent: '#1f6f54', accent2: '#b5651d', grid: '#e3ddd0', gridText: '#9c958a',
    font: "'Georgia','Times New Roman',serif",
  },
  business: {
    id: 'business', name: '商务 Business',
    paper: '#ffffff', ink: '#16213e', muted: '#5a6473',
    accent: '#0b5cab', accent2: '#c8102e', grid: '#e6ebf2', gridText: '#9fb0c3',
    font: "'Segoe UI','Helvetica Neue',Arial,sans-serif",
  },
  hand: {
    id: 'hand', name: '手绘 Hand-drawn', style: 'hand',
    paper: '#fffdf6', ink: '#2f2a24', muted: '#8a8175',
    accent: '#2F6FED', accent2: '#E0622E', grid: '#e6dfca', gridText: '#a89e87',
    font: "'Comic Sans MS','Segoe Print','Bradley Hand',cursive",
  },
};

export const THEME_LIST = Object.values(THEMES);

/** 品牌主题：用户填入主色/辅色/字体即生成一套语义 token（其余沿用浅色骨架）。 */
export function makeBrandTheme({ accent = '#2F6FED', accent2 = '#F5803E', font = "'Inter',Arial,sans-serif", name = '品牌 Brand' } = {}) {
  return {
    id: 'brand', name,
    paper: '#ffffff', ink: '#1f2430', muted: '#6b7280',
    accent, accent2, grid: '#EAECEF', gridText: '#9aa0a6', font,
  };
}

/**
 * WCAG AA 对比度校验（用于品牌配色自检，保证小字清晰）。
 * 返回对比度比值；>= 4.5 满足 AA 正文，>= 3 满足 AA 大字。
 */
export function luminance(hex) {
  const c = hex.replace('#', '');
  const rgb = c.length === 3 ? c.split('').map((x) => parseInt(x + x, 16)) : [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
