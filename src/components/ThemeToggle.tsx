'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      role="group"
      aria-label="Theme mode toggle"
      className={`inline-flex items-center p-0.5 sm:p-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-clay-pill transition-colors duration-200 select-none ${className}`}
    >
      {/* Dark Mode (Moon) Button */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-label="Activate Dark Mode"
        aria-pressed={isDark}
        title="Dark Mode"
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-slate-900 text-indigo-400 shadow-sm ring-1 ring-white/10 scale-100'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 scale-95 hover:scale-100'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isDark ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
      </button>

      {/* Light Mode (Sun) Button */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-label="Activate Light Mode"
        aria-pressed={!isDark}
        title="Light Mode"
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          !isDark
            ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5 scale-100'
            : 'text-slate-400 hover:text-slate-300 scale-95 hover:scale-100'
        }`}
      >
        <Sun className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${!isDark ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
      </button>
    </div>
  );
};
