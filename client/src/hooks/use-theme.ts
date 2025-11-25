import { useState, useEffect, useContext, createContext } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useThemeProvider() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme-preference') as Theme | null;
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const prefersSystemTheme = prefersLight ? 'light' : 'dark';
    const initialTheme = stored || prefersSystemTheme;
    
    setTheme(initialTheme);
    setIsMounted(true);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-preference', newTheme);
      applyTheme(newTheme);
      return newTheme;
    });
  };

  return { theme, toggleTheme, isMounted };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export { ThemeContext };
