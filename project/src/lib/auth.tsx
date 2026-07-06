import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './supabase';
import { fetchProfile } from './api';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      const user = data.session?.user ?? null;
      if (user) {
        fetchProfile(user.id)
          .then((p) => mounted && setProfile(p))
          .catch((e) => console.warn('profile load failed', e))
          .finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // onAuthStateChange callback must NOT await other Supabase calls directly —
    // wrap async work in an IIFE to avoid deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        const user = newSession?.user ?? null;
        setSession(newSession);
        if (user) {
          // profile row is created by the handle_new_user trigger; refetch
          // a couple times in case the trigger hasn't committed yet.
          let p: Profile | null = null;
          for (let i = 0; i < 4 && !p; i++) {
            p = await fetchProfile(user.id).catch(() => null);
            if (!p) await new Promise((r) => setTimeout(r, 250));
          }
          if (mounted) setProfile(p);
        } else {
          if (mounted) setProfile(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
