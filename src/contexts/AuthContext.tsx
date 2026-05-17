import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authLog, authWarn, authError } from '@/utils/authLog';

export type UserRole = 'admin' | 'advisor' | 'member';

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  chapter_id: string | null;
  is_approved: boolean;
  linkedin_url: string | null;
  headline: string | null;
  default_role: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  isApproved: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isLMSAdmin: boolean;
  isLMSAdvisor: boolean;
  isLMSStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const loadProfile = async (userId: string): Promise<ProfileData | null> => {
      const fetchOnce = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, chapter_id, is_approved, linkedin_url, headline, default_role, role')
          .eq('user_id', userId)
          .maybeSingle();
        return { data: data as ProfileData | null, error };
      };

      authLog('auth', 'profile_fetch_start', { user: userId });
      let { data, error } = await fetchOnce();
      if (error || !data) {
        if (error) {
          authError('auth', 'profile_fetch_error', { user: userId, code: (error as any).code }, error);
        } else {
          authWarn('auth', 'profile_fetch_empty', { user: userId });
        }
        authLog('auth', 'profile_fetch_retry', { user: userId, delay_ms: 500 });
        await new Promise((r) => setTimeout(r, 500));
        ({ data, error } = await fetchOnce());
        if (error) {
          authError('auth', 'profile_fetch_retry_error', { user: userId, code: (error as any).code }, error);
        }
      }
      if (data) {
        authLog('auth', 'profile_fetch_success', {
          user: userId,
          role: data.role,
          is_approved: data.is_approved,
          has_chapter: !!data.chapter_id,
        });
      } else {
        authWarn('auth', 'profile_fetch_gave_up', { user: userId });
      }
      return data;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLog('auth', 'auth_state_change', {
          event,
          has_session: !!session,
          user: session?.user?.id,
        });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const profileData = await loadProfile(session.user.id);
            setProfile(profileData);
            setLoading(false);
            authLog('auth', 'auth_ready', {
              user: session.user.id,
              has_profile: !!profileData,
              is_approved: profileData?.is_approved ?? false,
              role: profileData?.role,
            });
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
          authLog('auth', 'auth_ready', { has_session: false });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      authLog('auth', 'initial_get_session', {
        has_session: !!session,
        user: session?.user?.id,
      });
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    authLog('auth', 'sign_out_requested', { user: user?.id });
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin';
  const isApproved = profile?.is_approved ?? false;
  const isLMSAdmin = isAdmin;
  const isLMSAdvisor = isAdmin || profile?.role === 'advisor';
  const isLMSStudent = !!profile;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      isApproved,
      signOut,
      isAdmin,
      isLMSAdmin,
      isLMSAdvisor,
      isLMSStudent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
