import { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme } from './themeVars';

export type Theme = 'amber' | 'lapis' | 'ruby' | 'emerald' | 'onyx' | 'diamond';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const VALID: Theme[] = ['amber', 'lapis', 'ruby', 'emerald', 'onyx', 'diamond'];

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'amber',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const s = localStorage.getItem('theme') as Theme;
    return VALID.includes(s) ? s : 'amber';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
