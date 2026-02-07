import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Simplified role system - users have one role and module_access array
export type UserRole = 'admin' | 'organizer' | 'advisor' | 'member';
export type AccessModule = 'lms' | 'events' | 'attendee';

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
  module_access: string[] | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  isApproved: boolean;
  
  signOut: () => Promise<void>;
  
  // Role check
  isAdmin: boolean;
  
  // Module access checks
  hasModuleAccess: (module: AccessModule) => boolean;
  hasLMSAccess: boolean;
  hasEMAccess: boolean;
  hasAttendeeAccess: boolean;
  
  // Legacy compatibility - these map to the new simplified system
  isLMSAdmin: boolean;
  isLMSAdvisor: boolean;
  isLMSStudent: boolean;
  isEMAdmin: boolean;
  isEMManager: boolean;
  isEMAdvisor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile using setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, chapter_id, is_approved, linkedin_url, headline, default_role, role, module_access')
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Check if user has access to a specific module
  const hasModuleAccess = useCallback((module: AccessModule): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    return profile.module_access?.includes(module) ?? false;
  }, [profile]);

  // Computed values
  const isAdmin = profile?.role === 'admin';
  const isApproved = profile?.is_approved ?? false;
  
  // Module access checks
  const hasLMSAccess = hasModuleAccess('lms');
  const hasEMAccess = hasModuleAccess('events');
  const hasAttendeeAccess = hasModuleAccess('attendee');

  // Legacy compatibility - map to new simplified role system
  // For LMS: admin = lms_admin, advisor = lms_advisor, member = lms_student
  const isLMSAdmin = isAdmin;
  const isLMSAdvisor = isAdmin || (profile?.role === 'advisor' && hasLMSAccess);
  const isLMSStudent = hasLMSAccess;

  // For EM: admin = em_admin, organizer = em_manager, advisor = em_advisor
  const isEMAdmin = isAdmin;
  const isEMManager = isAdmin || (profile?.role === 'organizer' && hasEMAccess);
  const isEMAdvisor = hasEMAccess;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      profile, 
      isApproved,
      signOut,
      isAdmin,
      hasModuleAccess,
      hasLMSAccess,
      hasEMAccess,
      hasAttendeeAccess,
      isLMSAdmin,
      isLMSAdvisor,
      isLMSStudent,
      isEMAdmin,
      isEMManager,
      isEMAdvisor,
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
