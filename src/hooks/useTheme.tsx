import { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
type ColorTheme = 'teal' | 'blue' | 'warm' | 'purple';

interface ThemeContextValue {
  mode: Mode;
  colorTheme: ColorTheme;
  toggleMode: () => void;
  setColorTheme: (theme: ColorTheme) => void;
  // Legacy compat
  theme: Mode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colorTheme: 'teal',
  toggleMode: () => {},
  setColorTheme: () => {},
  theme: 'dark',
  toggleTheme: () => {},
});

export const colorThemes: { id: ColorTheme; label: string; accent: string }[] = [
  { id: 'teal', label: 'Teal', accent: '192 75% 36%' },
  { id: 'blue', label: 'Blue Professional', accent: '217 71% 45%' },
  { id: 'warm', label: 'Warm Neutral', accent: '30 50% 45%' },
  { id: 'purple', label: 'Purple Modern', accent: '270 60% 50%' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const stored = localStorage.getItem('theme') as Mode;
    return stored || 'dark';
  });
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    return (localStorage.getItem('colorTheme') as ColorTheme) || 'teal';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    // Remove old theme classes
    document.documentElement.classList.remove('theme-teal', 'theme-blue', 'theme-warm', 'theme-purple');
    document.documentElement.classList.add(`theme-${colorTheme}`);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleMode = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));
  const setColorTheme = (t: ColorTheme) => setColorThemeState(t);

  return (
    <ThemeContext.Provider value={{ mode, colorTheme, toggleMode, setColorTheme, theme: mode, toggleTheme: toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
