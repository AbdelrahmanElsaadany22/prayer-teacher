export type Theme = 'amber' | 'lapis' | 'ruby' | 'emerald' | 'onyx' | 'diamond';

interface ThemeConfig {
  vars: Record<string, string>;
  bodyGradient: string;
  docColor: string;
  docBg: string;
  glassy?: boolean;
  light?: boolean;
}

const pat = (color: string, opacity = '0.06') =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='${color}' stroke-opacity='${opacity}' stroke-width='1'%3E%3Crect x='16' y='16' width='32' height='32'/%3E%3Crect x='16' y='16' width='32' height='32' transform='rotate(45 32 32)'/%3E%3Ccircle cx='32' cy='32' r='3'/%3E%3C/g%3E%3C/svg%3E")`;

export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
  amber: {
    vars: {
      '--background':    '#150b05',
      '--surface':       '#1e1007',
      '--surface-light': '#2a1809',
      '--surface-hover': '#35200d',
      '--border':        'rgba(232,196,106,0.20)',
      '--border-hover':  'rgba(232,196,106,0.40)',
      '--text':          '#f5ede0',
      '--text-secondary':'#d4c4a8',
      '--muted':         '#b8a891',
      '--accent':        '#e8c46a',
      '--accent-dark':   '#c4973f',
      '--accent-bright': '#f0d078',
      '--accent-glow':   'rgba(232,196,106,0.18)',
      '--glow-top':      'rgba(210,140,40,0.14)',
      '--glow-side':     'rgba(232,196,106,0.08)',
      '--header-bg':     'rgba(21,11,5,0.82)',
      '--auth-card-bg':  'rgba(25,14,6,0.98)',
      '--input-bg':      '#0c0603',
      '--shadow-accent': '0 8px 32px rgba(232,196,106,0.25)',
      '--pattern':       pat('%23e8c46a'),
    },
    bodyGradient: `rgba(210,140,40,0.14)`,
    bodyGradientSide: `rgba(232,196,106,0.08)`,
    docColor: '#f5ede0',
    docBg:    '#150b05',
  } as ThemeConfig & { bodyGradient: string; bodyGradientSide: string },

  lapis: {
    vars: {
      '--background':    '#050d1a',
      '--surface':       '#0a1628',
      '--surface-light': '#0f1f38',
      '--surface-hover': '#162848',
      '--border':        'rgba(136,196,245,0.20)',
      '--border-hover':  'rgba(136,196,245,0.40)',
      '--text':          '#e8f4ff',
      '--text-secondary':'#c0d8f0',
      '--muted':         '#8aa8c8',
      '--accent':        '#88c4f5',
      '--accent-dark':   '#5a9fd4',
      '--accent-bright': '#a8d8ff',
      '--accent-glow':   'rgba(136,196,245,0.18)',
      '--glow-top':      'rgba(40,100,200,0.16)',
      '--glow-side':     'rgba(136,196,245,0.08)',
      '--header-bg':     'rgba(5,13,26,0.82)',
      '--auth-card-bg':  'rgba(8,18,36,0.98)',
      '--input-bg':      '#030810',
      '--shadow-accent': '0 8px 32px rgba(136,196,245,0.25)',
      '--pattern':       pat('%2388c4f5'),
    },
    bodyGradient: `rgba(40,100,200,0.16)`,
    bodyGradientSide: `rgba(136,196,245,0.08)`,
    docColor: '#e8f4ff',
    docBg:    '#050d1a',
  } as ThemeConfig & { bodyGradient: string; bodyGradientSide: string },

  ruby: {
    vars: {
      '--background':    '#150508',
      '--surface':       '#1e0810',
      '--surface-light': '#280b16',
      '--surface-hover': '#32101e',
      '--border':        'rgba(245,160,176,0.20)',
      '--border-hover':  'rgba(245,160,176,0.40)',
      '--text':          '#ffe8ed',
      '--text-secondary':'#f0c0cc',
      '--muted':         '#c88898',
      '--accent':        '#f5a0b0',
      '--accent-dark':   '#d4607a',
      '--accent-bright': '#ffbbc8',
      '--accent-glow':   'rgba(245,160,176,0.18)',
      '--glow-top':      'rgba(200,40,80,0.16)',
      '--glow-side':     'rgba(245,160,176,0.08)',
      '--header-bg':     'rgba(21,5,8,0.82)',
      '--auth-card-bg':  'rgba(25,6,10,0.98)',
      '--input-bg':      '#0c0305',
      '--shadow-accent': '0 8px 32px rgba(245,160,176,0.25)',
      '--pattern':       pat('%23f5a0b0'),
    },
    bodyGradient: `rgba(200,40,80,0.16)`,
    bodyGradientSide: `rgba(245,160,176,0.08)`,
    docColor: '#ffe8ed',
    docBg:    '#150508',
  } as ThemeConfig & { bodyGradient: string; bodyGradientSide: string },

  emerald: {
    vars: {
      '--background':    '#050f08',
      '--surface':       '#0a1a0d',
      '--surface-light': '#0f2414',
      '--surface-hover': '#152e1a',
      '--border':        'rgba(110,232,154,0.20)',
      '--border-hover':  'rgba(110,232,154,0.40)',
      '--text':          '#e8fff0',
      '--text-secondary':'#c0f0d0',
      '--muted':         '#88c8a0',
      '--accent':        '#6ee89a',
      '--accent-dark':   '#40c070',
      '--accent-bright': '#90f0b8',
      '--accent-glow':   'rgba(110,232,154,0.18)',
      '--glow-top':      'rgba(30,160,70,0.16)',
      '--glow-side':     'rgba(110,232,154,0.08)',
      '--header-bg':     'rgba(5,15,8,0.82)',
      '--auth-card-bg':  'rgba(8,20,10,0.98)',
      '--input-bg':      '#030805',
      '--shadow-accent': '0 8px 32px rgba(110,232,154,0.25)',
      '--pattern':       pat('%236ee89a'),
    },
    bodyGradient: `rgba(30,160,70,0.16)`,
    bodyGradientSide: `rgba(110,232,154,0.08)`,
    docColor: '#e8fff0',
    docBg:    '#050f08',
  } as ThemeConfig & { bodyGradient: string; bodyGradientSide: string },

  onyx: {
    vars: {
      '--background':    '#080808',
      '--surface':       '#101010',
      '--surface-light': '#181818',
      '--surface-hover': '#202020',
      '--border':        'rgba(200,200,216,0.16)',
      '--border-hover':  'rgba(200,200,216,0.32)',
      '--text':          '#f0f0f8',
      '--text-secondary':'#d0d0e0',
      '--muted':         '#909090',
      '--accent':        '#c8c8d8',
      '--accent-dark':   '#a0a0b8',
      '--accent-bright': '#e0e0f0',
      '--accent-glow':   'rgba(200,200,216,0.12)',
      '--glow-top':      'rgba(120,120,160,0.10)',
      '--glow-side':     'rgba(200,200,216,0.05)',
      '--header-bg':     'rgba(8,8,8,0.88)',
      '--auth-card-bg':  'rgba(12,12,12,0.98)',
      '--input-bg':      '#050505',
      '--shadow-accent': '0 8px 32px rgba(200,200,216,0.15)',
      '--pattern':       pat('%23c8c8d8', '0.05'),
    },
    bodyGradient: `rgba(120,120,160,0.10)`,
    bodyGradientSide: `rgba(200,200,216,0.05)`,
    docColor: '#f0f0f8',
    docBg:    '#080808',
  } as ThemeConfig & { bodyGradient: string; bodyGradientSide: string },

  diamond: {
    vars: {
      '--background':    '#eef4ff',
      '--surface':       'rgba(255,255,255,0.82)',
      '--surface-light': 'rgba(240,246,255,0.90)',
      '--surface-hover': 'rgba(220,232,255,0.95)',
      '--border':        'rgba(60,120,220,0.14)',
      '--border-hover':  'rgba(60,120,220,0.34)',
      '--text':          '#1a2650',
      '--text-secondary':'#2a3870',
      '--muted':         '#5a6898',
      '--accent':        '#3b82f6',
      '--accent-dark':   '#1d4ed8',
      '--accent-bright': '#60a5fa',
      '--accent-glow':   'rgba(59,130,246,0.14)',
      '--glow-top':      'rgba(100,160,255,0.18)',
      '--glow-side':     'rgba(180,210,255,0.12)',
      '--header-bg':     'rgba(232,240,255,0.84)',
      '--auth-card-bg':  'rgba(255,255,255,0.88)',
      '--input-bg':      'rgba(245,248,255,0.95)',
      '--shadow-accent': '0 8px 32px rgba(59,130,246,0.22)',
      '--shadow-sm':     '0 1px 4px rgba(0,0,0,0.08)',
      '--shadow-md':     '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
      '--shadow-lg':     '0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.07)',
      '--pattern':       pat('%233b82f6', '0.06'),
    },
    bodyGradient: `rgba(100,160,255,0.18)`,
    bodyGradientSide: `rgba(180,210,255,0.12)`,
    docColor: '#1a2650',
    docBg:    '#eef4ff',
    glassy: true,
    light: true,
  } as ThemeConfig & { bodyGradient: string; bodyGradientSide: string },
};

export function applyTheme(theme: Theme): void {
  const cfg = THEME_CONFIGS[theme] as ThemeConfig & { bodyGradient: string; bodyGradientSide: string };
  const root = document.documentElement;

  // Apply all CSS custom properties
  Object.entries(cfg.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Set body background
  const pattern = cfg.vars['--pattern'];
  const bg = cfg.vars['--background'];
  document.body.style.background = `${pattern}, radial-gradient(ellipse 70% 45% at 50% 0%, ${cfg.bodyGradient}, transparent 60%), radial-gradient(circle at 85% 100%, ${cfg.bodyGradientSide}, transparent 35%), ${bg}`;
  document.body.style.backgroundAttachment = 'fixed';

  // Inject overrides for hardcoded CSS values
  const glassy = cfg.glassy
    ? `.auth-card, .nav-menu { backdrop-filter: blur(24px) saturate(1.6) !important; -webkit-backdrop-filter: blur(24px) saturate(1.6) !important; } .site-header, .site-footer { backdrop-filter: blur(20px) saturate(1.4) !important; -webkit-backdrop-filter: blur(20px) saturate(1.4) !important; }`
    : '';

  const headerBg = cfg.vars['--header-bg'];
  const authCardBg = cfg.vars['--auth-card-bg'];
  const inputBg = cfg.vars['--input-bg'];
  const accentBright = cfg.vars['--accent-bright'];
  const accentGlow = cfg.vars['--accent-glow'];
  const borderHover = cfg.vars['--border-hover'];

  let el = document.getElementById('__theme_overrides__');
  if (!el) {
    el = document.createElement('style');
    el.id = '__theme_overrides__';
    document.head.appendChild(el);
  }
  el.textContent = `
    .site-header { background: ${headerBg} !important; }
    .site-footer { background: ${headerBg} !important; }
    .auth-card { background: ${authCardBg} !important; }
    .auth-input-wrapper input { background: ${inputBg} !important; }
    .auth-submit:hover:not(:disabled), .primary-link:hover { background: ${accentBright} !important; }
    .auth-switch a:hover { color: ${accentBright} !important; }
    ::selection { background: ${accentGlow} !important; }
    ::-webkit-scrollbar-thumb { background: ${borderHover} !important; }
    ${glassy}
  `;
}
