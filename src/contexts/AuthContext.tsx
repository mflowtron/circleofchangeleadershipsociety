import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Note: app_role enum includes 'admin', 'advisor', 'student', 'event_organizer'
type AppRole = Database['public']['Enums']['app_role'] | 'event_organizer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    chapter_id: string | null;
  } | null;
  role: AppRole | null;
  signOut: () => Promise<void>;
  // Access helpers
  hasLMSAccess: boolean;
  hasEventsAccess: boolean;
  hasDualAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile and role using setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, chapter_id')
              .eq('user_id', session.user.id)
              .single();

            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            setProfile(profileData);
            setRole(roleData?.role ?? null);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear dashboard preference on sign out
    localStorage.removeItem('preferred_dashboard');
    await supabase.auth.signOut();
  };

  // Access helpers
  const hasLMSAccess = role === 'admin' || role === 'advisor' || role === 'student';
  const hasEventsAccess = role === 'admin' || role === 'event_organizer';
  const hasDualAccess = hasLMSAccess && hasEventsAccess;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      profile, 
      role, 
      signOut,
      hasLMSAccess,
      hasEventsAccess,
      hasDualAccess
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
