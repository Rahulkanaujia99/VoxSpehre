'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { PlayerSettingsProvider } from '@/context/PlayerSettingsContext';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PlayerSettingsProvider>{children}</PlayerSettingsProvider>
    </AuthProvider>
  );
};
