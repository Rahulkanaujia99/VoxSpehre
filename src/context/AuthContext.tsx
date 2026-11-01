'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signInAsGuest: (email?: string, name?: string) => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateUserProfile: (fullName: string, avatarUrl?: string | null) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isConfigured: false,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signInAsGuest: () => {},
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updateUserProfile: async () => ({ error: null }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const configured = useMemo(() => isSupabaseConfigured(), []);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // 1. Initial Session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!configured) {
      return { error: new Error('Supabase is not configured yet. Add your NEXT_PUBLIC_SUPABASE_URL and KEY in .env.local') };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!configured) {
      return { error: new Error('Supabase is not configured yet. Add your NEXT_PUBLIC_SUPABASE_URL and KEY in .env.local') };
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    });

    const needsEmailConfirmation = Boolean(data.user && !data.session);
    return { error, needsEmailConfirmation };
  };

  const signInAsGuest = (email?: string, name?: string) => {
    const demoUser = {
      id: 'demo-user-id',
      app_metadata: {},
      user_metadata: { full_name: name || 'Rahul Kanaujia' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: email || 'rahul@voxsphere.ai',
    } as unknown as User;

    setUser(demoUser);
    setProfile({
      id: 'demo-user-id',
      email: email || 'rahul@voxsphere.ai',
      full_name: name || 'Rahul Kanaujia',
      avatar_url: null,
      company: 'Penguin International',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const signOut = async () => {
    if (configured) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!configured) {
      return { error: new Error('Supabase is not configured yet') };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    return { error };
  };

  const updateUserProfile = async (fullName: string, avatarUrl?: string | null) => {
    try {
      if (configured && user && user.id !== 'demo-user-id') {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
          },
        });

        const updatePayload: Record<string, any> = {
          full_name: fullName,
          updated_at: new Date().toISOString(),
        };
        if (avatarUrl !== undefined) {
          updatePayload.avatar_url = avatarUrl;
        }

        await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);
      }

      if (profile) {
        setProfile({
          ...profile,
          full_name: fullName,
          avatar_url: avatarUrl !== undefined ? avatarUrl : profile.avatar_url,
        });
      } else if (user) {
        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: fullName,
          avatar_url: avatarUrl || null,
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
        });
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to update profile') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: configured,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
