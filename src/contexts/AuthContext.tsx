import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/roles';
import type { UserProfile } from '@/types/auth';
import type { UserType } from '@/types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  userType: UserType | null;
  companyId: number | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('fn_get_user', { p_user_id: userId });
    if (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
    return data as unknown as UserProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Use onAuthStateChange for everything — including INITIAL_SESSION.
    // Do NOT call Supabase inside this callback — it deadlocks on internal locks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (!s?.user) {
          setProfile(null);
          setIsLoading(false); // No user — fully resolved.
        }
        // When a user exists, keep isLoading=true until the profile effect below resolves.
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile separately — never inside onAuthStateChange to avoid deadlocks.
  // isLoading stays true until this resolves so RoleGuard doesn't redirect prematurely.
  // Skip re-fetch when it's the same user (token refresh) — avoids a spurious
  // isLoading=true that would unmount ProtectedRoute's children.
  useEffect(() => {
    if (!user) return;
    if (lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;

    let cancelled = false;
    setIsLoading(true);
    fetchProfile(user.id).then((p) => {
      if (!cancelled) {
        if (p) setProfile(p);
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('[auth] profile fetch error:', err);
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const userType = profile?.type ?? null;
  const companyId = profile?.associated_to_company_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAdmin: isAdmin(userType),
        userType,
        companyId,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
