import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, chapter_id, is_approved, linkedin_url, headline, default_role, role')
              .eq('user_id', session.user.id)
              .single();

            setProfile(profileData as ProfileData | null);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
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
