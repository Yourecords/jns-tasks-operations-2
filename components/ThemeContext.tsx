'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read preference from URL param, localStorage, or default to 'dark'
    try {
      let initial: ThemeMode = 'dark';
      if (typeof window !== 'undefined') {
        const param = new URLSearchParams(window.location.search).get('theme');
        if (param === 'light' || param === 'dark') {
          initial = param;
          localStorage.setItem('jns_theme', param);
        } else {
          const saved = localStorage.getItem('jns_theme') as ThemeMode | null;
          if (saved === 'light' || saved === 'dark') {
            initial = saved;
          }
        }
      }
      setThemeState(initial);
      applyTheme(initial);
    } catch {
      applyTheme('dark');
    }
    setMounted(true);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', mode);
      if (mode === 'light') {
        root.classList.add('theme-light');
        root.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      } else {
        root.classList.add('theme-dark');
        root.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      }
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    applyTheme(mode);
    try {
      localStorage.setItem('jns_theme', mode);
    } catch (err) {
      console.error('Failed to save theme preference', err);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
