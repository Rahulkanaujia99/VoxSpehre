'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type PlayerDesign = 'purple-glass' | 'teal-glass';

interface PlayerSettingsContextType {
  playerDesign: PlayerDesign;
  setPlayerDesign: (design: PlayerDesign) => Promise<void>;
  isLoaded: boolean;
}

const STORAGE_KEY = 'voxsphere_player_design';

const PlayerSettingsContext = createContext<PlayerSettingsContextType>({
  playerDesign: 'purple-glass',
  setPlayerDesign: async () => {},
  isLoaded: false,
});

export const PlayerSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [playerDesign, setPlayerDesignState] = useState<PlayerDesign>('purple-glass');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as PlayerDesign | null;
      if (stored === 'purple-glass' || stored === 'teal-glass') {
        setPlayerDesignState(stored);
      }
    } catch (e) {
      console.warn('Could not read player design preference from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Sync with User Account Metadata / Profile when User logs in
  useEffect(() => {
    if (!user) return;

    // Check user_metadata or profile
    const remotePref =
      (user.user_metadata?.player_design as PlayerDesign) ||
      ((profile as any)?.player_design as PlayerDesign);

    if (remotePref === 'purple-glass' || remotePref === 'teal-glass') {
      setPlayerDesignState(remotePref);
      try {
        localStorage.setItem(STORAGE_KEY, remotePref);
      } catch {}
    } else {
      // If user has local pref but no remote pref, sync local pref to remote account
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as PlayerDesign | null;
        if (stored === 'purple-glass' || stored === 'teal-glass') {
          syncToRemote(stored, user.id);
        }
      } catch {}
    }
  }, [user, profile]);

  const syncToRemote = async (design: PlayerDesign, userId?: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { player_design: design },
      });
      if (userId) {
        await supabase
          .from('profiles')
          .update({ player_design: design } as any)
          .eq('id', userId);
      }
    } catch (e) {
      console.warn('Could not persist player design to Supabase:', e);
    }
  };

  const setPlayerDesign = useCallback(
    async (design: PlayerDesign) => {
      setPlayerDesignState(design);
      try {
        localStorage.setItem(STORAGE_KEY, design);
      } catch (e) {
        console.warn('Could not save player design to localStorage:', e);
      }

      if (user) {
        await syncToRemote(design, user.id);
      }
    },
    [user]
  );

  return (
    <PlayerSettingsContext.Provider
      value={{
        playerDesign,
        setPlayerDesign,
        isLoaded,
      }}
    >
      {children}
    </PlayerSettingsContext.Provider>
  );
};

export const usePlayerSettings = () => useContext(PlayerSettingsContext);

