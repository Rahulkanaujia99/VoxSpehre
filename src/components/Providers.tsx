'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { PlayerSettingsProvider } from '@/context/PlayerSettingsContext';
import { PageTransitionProvider } from '@/components/PageTransition';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PlayerSettingsProvider>
        <PageTransitionProvider>{children}</PageTransitionProvider>
      </PlayerSettingsProvider>
    </AuthProvider>
  );
};
