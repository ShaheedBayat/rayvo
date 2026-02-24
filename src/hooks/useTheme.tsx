import { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
type ColorTheme = 'ocean' | 'navy' | 'sapphire' | 'slate' | 'copper';

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
  { id: 'ocean', label: 'Refined Teal', accent: '180 84% 35%', vibe: 'Clean & Professional', font: 'Inter', description: 'Crisp teal palette. Feels financial, looks expensive, safe but powerful.' },
  { id: 'navy', label: 'Navy Emerald', accent: '160 94% 30%', vibe: 'Enterprise Level', font: 'Inter', description: 'Premium navy + emerald. CFO-approved, more serious than Xero.' },
  { id: 'sapphire', label: 'SaaS Blue', accent: '221 83% 53%', vibe: 'Modern & Tech-Forward', font: 'Inter', description: 'Stripe-style clean blue. Very modern with insane dark mode.' },
  { id: 'slate', label: 'Slate Cyan', accent: '189 95% 43%', vibe: 'Minimal & Ultra Clean', font: 'Inter', description: 'Neutral slate + cyan. Extremely clean, feels like a 2026 SaaS.' },
  { id: 'copper', label: 'Teal Copper', accent: '33 90% 37%', vibe: 'Premium & Unique', font: 'Inter', description: 'Dark teal + warm copper. Luxury feel, stands out in accounting.' },
];

const ALL_THEME_CLASSES = colorThemes.map(t => `theme-${t.id}`);

// Migration: map old theme IDs to new ones
const THEME_MIGRATION: Record<string, ColorTheme> = {
  teal: 'ocean',
  blue: 'sapphire',
  warm: 'copper',
  purple: 'sapphire',
  corporate: 'navy',
  editorial: 'navy',
  creative: 'copper',
  midnight: 'navy',
  brutalist: 'slate',
  rose: 'copper',
  cyber: 'sapphire',
  forest: 'navy',
  berry: 'sapphire',
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
