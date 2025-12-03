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
  default: {
    background: 'bg-slate-900',
    card: 'bg-slate-800/50 backdrop-blur-sm border-slate-700',
    text: 'text-white',
    header: 'bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400'
  },
  christmas: {
    background: 'bg-gradient-to-br from-red-900 via-green-900 to-red-800',
    card: 'bg-green-950/50 backdrop-blur-sm border-yellow-400/50',
    text: 'text-yellow-100',
    header: 'text-yellow-300'
  },
  newYear: {
    background: 'bg-gradient-to-br from-gray-900 via-black to-blue-900',
    card: 'bg-gray-800/60 backdrop-blur-sm border-yellow-500/60',
    text: 'text-white',
    header: 'text-yellow-400'
  }
};

// Definisikan rentang tanggal untuk hari besar
const holidays = [
  { name: 'christmas', startMonth: 11, startDate: 20, endMonth: 11, endDate: 31 }, // 20-31 Desember
  { name: 'newYear', startMonth: 0, startDate: 1, endMonth: 0, endDate: 5 } // 1-5 Januari
];

const getActiveThemeName = (): string => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Januari, 11 = Desember
  const date = now.getDate();

  for (const holiday of holidays) {
    if (month >= holiday.startMonth && month <= holiday.endMonth) {
      if (date >= holiday.startDate && date <= holiday.endDate) {
        return holiday.name;
      }
    }
  }
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