import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Definisikan struktur tema
interface AppTheme {
  background: string;
  card: string;
  text: string;
  header: string;
}

// Definisikan semua tema yang tersedia
const themes: Record<string, AppTheme> = {
  default: { // Mengubah tema default menjadi tema Natal
    background: 'bg-gradient-to-br from-red-800 via-red-900 to-green-900',
    card: 'bg-green-950/50 backdrop-blur-sm border-yellow-400/50',
    text: 'text-yellow-100',
    header: 'text-yellow-300 font-serif'
  },
  // Tema lama disimpan di sini jika ingin dikembalikan
  original: {
    background: 'bg-slate-900',
    card: 'bg-slate-800/50 backdrop-blur-sm border-slate-700',
    text: 'text-white',
    header: 'bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400'
  }
};

// Fungsi ini sekarang hanya mengembalikan 'default'
const getActiveThemeName = (): string => {
  return 'default';
};

interface ThemeContextType {
  theme: AppTheme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<AppTheme>(themes.default);

  useEffect(() => {
    const themeName = getActiveThemeName();
    setTheme(themes[themeName] || themes.default);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};