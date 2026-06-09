'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeText, THEME_TEXT, getStoredTheme, setStoredTheme } from '@/lib/theme';

type ThemeCtx = {
  theme: Theme;
  t: ThemeText;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  theme: 'normal',
  t: THEME_TEXT.normal,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('normal');

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    if (stored === 'dungeon') {
      document.documentElement.classList.add('dungeon');
    }
  }, []);

  function toggle() {
    const next: Theme = theme === 'normal' ? 'dungeon' : 'normal';
    setTheme(next);
    setStoredTheme(next);
    if (next === 'dungeon') {
      document.documentElement.classList.add('dungeon');
    } else {
      document.documentElement.classList.remove('dungeon');
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, t: THEME_TEXT[theme], toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
