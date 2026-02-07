import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Role system - users can have multiple roles
export type AppRole = 
  | 'lms_student' | 'lms_advisor' | 'lms_admin'
  | 'em_advisor' | 'em_manager' | 'em_admin'
  | 'attendee_student' | 'attendee_advisor';

export type AccessArea = 'lms' | 'em' | 'attendee';

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  chapter_id: string | null;
  is_approved: boolean;
  linkedin_url: string | null;
  headline: string | null;
  default_role: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  roles: AppRole[];
  defaultRole: AppRole | null;
  isApproved: boolean;
  
  signOut: () => Promise<void>;
  setDefaultRole: (role: AppRole) => Promise<void>;
  
  // Computed access flags
  hasLMSAccess: boolean;
  hasEMAccess: boolean;
  hasAttendeeAccess: boolean;
  accessibleAreas: AccessArea[];
  
  // Helper functions
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  
  // LMS-specific role checks
  isLMSAdmin: boolean;
  isLMSAdvisor: boolean;
  isLMSStudent: boolean;
  
  // EM-specific role checks
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
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile and roles using setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, chapter_id, is_approved, linkedin_url, headline, default_role')
              .eq('user_id', session.user.id)
              .single();

            // Fetch ALL roles for this user (users can have multiple)
            const { data: rolesData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);

            setProfile(profileData);
            setRoles(rolesData?.map(r => r.role as AppRole) ?? []);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
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

  const setDefaultRole = useCallback(async (role: AppRole) => {
    if (!profile) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ default_role: role })
      .eq('id', profile.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, default_role: role } : null);
    }
  }, [profile]);

  // Helper function to check if user has a specific role
  const hasRole = useCallback((role: AppRole) => {
    return roles.includes(role);
  }, [roles]);

  // Helper function to check if user has any of the specified roles
  const hasAnyRole = useCallback((rolesToCheck: AppRole[]) => {
    return rolesToCheck.some(role => roles.includes(role));
  }, [roles]);

  // Compute access flags based on roles (no legacy role support)
  const hasLMSAccess = hasAnyRole(['lms_admin', 'lms_advisor', 'lms_student']);
  const hasEMAccess = hasAnyRole(['em_admin', 'em_manager', 'em_advisor']);
  const hasAttendeeAccess = hasAnyRole(['attendee_student', 'attendee_advisor']);

  // LMS role checks (hierarchical)
  const isLMSAdmin = hasRole('lms_admin');
  const isLMSAdvisor = hasRole('lms_advisor') || isLMSAdmin;
  const isLMSStudent = hasRole('lms_student') || isLMSAdvisor;

  // EM role checks (hierarchical)
  const isEMAdmin = hasRole('em_admin');
  const isEMManager = hasRole('em_manager') || isEMAdmin;
  const isEMAdvisor = hasRole('em_advisor') || isEMManager;

  // Compute accessible areas
  const accessibleAreas: AccessArea[] = [];
  if (hasLMSAccess) accessibleAreas.push('lms');
  if (hasEMAccess) accessibleAreas.push('em');
  if (hasAttendeeAccess) accessibleAreas.push('attendee');

  const isApproved = profile?.is_approved ?? false;
  const defaultRole = (profile?.default_role as AppRole) ?? null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      profile, 
      roles,
      defaultRole,
      isApproved,
      signOut,
      setDefaultRole,
      hasLMSAccess,
      hasEMAccess,
      hasAttendeeAccess,
      accessibleAreas,
      hasRole,
      hasAnyRole,
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
