'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  // Initialize theme from localStorage on client mount (defaults to 'light')
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem('voxsphere_theme') as Theme | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeState(savedTheme);
        applyThemeToDom(savedTheme);
      } else {
        // Default to Light Mode as required
        setThemeState('light');
        applyThemeToDom('light');
      }
    } catch {
      applyThemeToDom('light');
    }
  }, []);

  // When user logs in, check if their profile has a saved theme preference
  useEffect(() => {
    if (user && user.user_metadata?.theme) {
      const userTheme = user.user_metadata.theme as Theme;
      if (userTheme === 'dark' || userTheme === 'light') {
        setThemeState(userTheme);
        applyThemeToDom(userTheme);
        try {
          localStorage.setItem('voxsphere_theme', userTheme);
        } catch {}
      }
    }
  }, [user]);

  const applyThemeToDom = (targetTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDom(newTheme);
    try {
      localStorage.setItem('voxsphere_theme', newTheme);
    } catch {}

    // Persist to Supabase user metadata if signed in
    if (isSupabaseConfigured() && user && user.id !== 'demo-user-id') {
      try {
        const supabase = createClient();
        supabase.auth.updateUser({
          data: { theme: newTheme },
        }).catch(() => {});
      } catch {}
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
