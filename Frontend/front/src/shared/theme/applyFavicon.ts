import { THEME_CONFIGS, type Theme } from './themeVars';

let cachedImg: HTMLImageElement | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  if (cachedImg?.complete && cachedImg.naturalWidth > 0) return Promise.resolve(cachedImg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { cachedImg = img; resolve(img); };
    img.onerror = reject;
    img.src = '/logo.png';
  });
}

export async function applyFaviconForTheme(theme: Theme): Promise<void> {
  const filter = THEME_CONFIGS[theme].vars['--logo-filter'] ?? 'none';
  try {
    const img = await loadLogo();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    if (filter !== 'none') ctx.filter = filter;
    ctx.drawImage(img, 0, 0, 64, 64);
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = canvas.toDataURL('image/png');
  } catch {
    // favicon is non-critical
  }
}
