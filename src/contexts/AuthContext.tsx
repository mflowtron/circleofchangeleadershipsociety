import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// New role system - users can have multiple roles
export type AppRole = 
  | 'lms_student' | 'lms_advisor' | 'lms_admin'
  | 'em_advisor' | 'em_manager' | 'em_admin'
  | 'attendee_student' | 'attendee_advisor'
  // Legacy roles (for backward compatibility during migration)
  | 'admin' | 'advisor' | 'student' | 'event_organizer';

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
  
  // Legacy compatibility - primary role (first LMS role or first role)
  role: AppRole | null;
  signOut: () => Promise<void>;
  setDefaultRole: (role: AppRole) => Promise<void>;
  
  // Computed access flags
  hasLMSAccess: boolean;
  hasEMAccess: boolean;
  hasEventsAccess: boolean; // Alias for hasEMAccess (legacy compatibility)
  hasAttendeeAccess: boolean;
  hasDualAccess: boolean; // Legacy: has both LMS and EM access
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

// Helper to determine which area a role belongs to
function getRoleArea(role: AppRole): AccessArea | null {
  if (role.startsWith('lms_') || ['admin', 'advisor', 'student'].includes(role)) return 'lms';
  if (role.startsWith('em_') || role === 'event_organizer') return 'em';
  if (role.startsWith('attendee_')) return 'attendee';
  return null;
}

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

  // Compute access flags based on roles
  const hasLMSAccess = hasAnyRole(['lms_admin', 'lms_advisor', 'lms_student', 'admin', 'advisor', 'student']);
  const hasEMAccess = hasAnyRole(['em_admin', 'em_manager', 'em_advisor', 'admin', 'event_organizer']);
  const hasEventsAccess = hasEMAccess; // Legacy alias
  const hasAttendeeAccess = hasAnyRole(['attendee_student', 'attendee_advisor']);
  const hasDualAccess = hasLMSAccess && hasEMAccess; // Legacy

  // LMS role checks
  const isLMSAdmin = hasAnyRole(['lms_admin', 'admin']);
  const isLMSAdvisor = hasAnyRole(['lms_advisor', 'advisor']) || isLMSAdmin;
  const isLMSStudent = hasAnyRole(['lms_student', 'student']) || isLMSAdvisor;

  // EM role checks
  const isEMAdmin = hasAnyRole(['em_admin', 'admin']);
  const isEMManager = hasAnyRole(['em_manager', 'event_organizer']) || isEMAdmin;
  const isEMAdvisor = hasRole('em_advisor') || isEMManager;

  // Compute accessible areas
  const accessibleAreas: AccessArea[] = [];
  if (hasLMSAccess) accessibleAreas.push('lms');
  if (hasEMAccess) accessibleAreas.push('em');
  if (hasAttendeeAccess) accessibleAreas.push('attendee');

  const isApproved = profile?.is_approved ?? false;
  const defaultRole = (profile?.default_role as AppRole) ?? null;
  
  // Legacy: primary role for backward compatibility (prefer LMS roles)
  const primaryRole: AppRole | null = roles.find(r => 
    ['lms_admin', 'lms_advisor', 'lms_student', 'admin', 'advisor', 'student'].includes(r)
  ) || roles[0] || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      profile, 
      roles,
      role: primaryRole,
      defaultRole,
      isApproved,
      signOut,
      setDefaultRole,
      hasLMSAccess,
      hasEMAccess,
      hasEventsAccess,
      hasAttendeeAccess,
      hasDualAccess,
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
