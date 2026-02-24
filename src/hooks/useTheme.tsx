import { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
type ColorTheme = 'ocean' | 'slate' | 'forest' | 'crimson';

interface ThemeContextValue {
  mode: Mode;
  colorTheme: ColorTheme;
  toggleMode: () => void;
  setColorTheme: (theme: ColorTheme) => void;
  theme: Mode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colorTheme: 'ocean',
  toggleMode: () => {},
  setColorTheme: () => {},
  theme: 'light',
  toggleTheme: () => {},
});

export const colorThemes: {
  id: ColorTheme;
  label: string;
  accent: string;
  vibe: string;
  font: string;
  description: string;
}[] = [
  { id: 'ocean', label: 'Ocean', accent: '192 75% 36%', vibe: 'Clean & Professional', font: 'Inter', description: 'Crisp teal palette. The go-to for polished, professional invoicing.' },
  { id: 'slate', label: 'Slate', accent: '215 55% 42%', vibe: 'Cool & Composed', font: 'Inter', description: 'Deep blue tones. Calm, neutral, and versatile.' },
  { id: 'forest', label: 'Forest', accent: '152 75% 30%', vibe: 'Natural & Grounded', font: 'Inter', description: 'Rich green palette inspired by nature. Balanced and trustworthy.' },
  { id: 'crimson', label: 'Crimson', accent: '0 72% 42%', vibe: 'Bold & Confident', font: 'Inter', description: 'Striking red accent. Powerful and attention-grabbing.' },
];

const ALL_THEME_CLASSES = colorThemes.map(t => `theme-${t.id}`);

// Migration: map old theme IDs to new ones
const THEME_MIGRATION: Record<string, ColorTheme> = {
  teal: 'ocean',
  blue: 'slate',
  warm: 'forest',
  purple: 'crimson',
  berry: 'crimson',
  corporate: 'slate',
  editorial: 'forest',
  creative: 'crimson',
  midnight: 'ocean',
  brutalist: 'ocean',
  rose: 'crimson',
  cyber: 'ocean',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const stored = localStorage.getItem('theme') as Mode;
    return stored || 'light';
  });
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem('colorTheme') as string;
    // Migrate old theme names
    if (stored && THEME_MIGRATION[stored]) return THEME_MIGRATION[stored];
    if (stored && ALL_THEME_CLASSES.includes(`theme-${stored}`)) return stored as ColorTheme;
    return 'ocean';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    // Use data attribute for theme (more reliable than classes for CSS specificity)
    document.documentElement.setAttribute('data-theme', colorTheme);
    // Also keep class for backward compat
    ALL_THEME_CLASSES.forEach(cls => document.documentElement.classList.remove(cls));
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
