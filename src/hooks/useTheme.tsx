import { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
type ColorTheme = 'ocean' | 'corporate' | 'editorial' | 'creative' | 'midnight' | 'brutalist' | 'rose' | 'cyber';

interface ThemeContextValue {
  mode: Mode;
  colorTheme: ColorTheme;
  toggleMode: () => void;
  setColorTheme: (theme: ColorTheme) => void;
  theme: Mode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colorTheme: 'ocean',
  toggleMode: () => {},
  setColorTheme: () => {},
  theme: 'dark',
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
  { id: 'ocean', label: 'Ocean', accent: '192 75% 36%', vibe: 'Clean & Professional', font: 'Inter', description: 'Minimal teal palette with crisp typography. The go-to for polished SaaS.' },
  { id: 'corporate', label: 'Corporate', accent: '217 71% 45%', vibe: 'Structured & Authoritative', font: 'Space Grotesk', description: 'Deep blue palette with geometric type. Built for boardrooms.' },
  { id: 'editorial', label: 'Editorial', accent: '28 55% 42%', vibe: 'Earthy & Refined', font: 'Playfair Display', description: 'Warm amber tones with serif headings. Magazine-quality elegance.' },
  { id: 'creative', label: 'Creative', accent: '265 65% 52%', vibe: 'Bold & Expressive', font: 'DM Serif Display', description: 'Rich purple palette with decorative type. For brands that stand out.' },
  { id: 'midnight', label: 'Midnight', accent: '190 85% 50%', vibe: 'Dark & Immersive', font: 'Outfit', description: 'Neon cyan on deep dark. Glassmorphism cards, futuristic glow effects.' },
  { id: 'brutalist', label: 'Brutalist', accent: '0 0% 5%', vibe: 'Raw & Direct', font: 'IBM Plex Mono', description: 'Zero radius, heavy borders, monospace everything. Unapologetically stark.' },
  { id: 'rose', label: 'Rose', accent: '340 55% 52%', vibe: 'Elegant & Soft', font: 'Crimson Pro', description: 'Blush pink with serif headings and extra-rounded corners. Refined luxury.' },
  { id: 'cyber', label: 'Cyber', accent: '145 80% 38%', vibe: 'Futuristic & Bold', font: 'JetBrains Mono', description: 'Neon green with razor-sharp edges. Terminal aesthetic meets modern UI.' },
];

const ALL_THEME_CLASSES = colorThemes.map(t => `theme-${t.id}`);

// Migration: map old theme IDs to new ones
const THEME_MIGRATION: Record<string, ColorTheme> = {
  teal: 'ocean',
  blue: 'corporate',
  warm: 'editorial',
  purple: 'creative',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const stored = localStorage.getItem('theme') as Mode;
    return stored || 'dark';
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
