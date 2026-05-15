import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  RegistrationSession,
  RegistrationOrder,
  RegistrationCheckoutRequest,
  VerifyPaymentResponse,
} from '@/types/registration';

const SESSION_KEY = 'registration_session';

function getStoredSession(): RegistrationSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as RegistrationSession;
    if (parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function useRegistration() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<RegistrationSession | null>(getStoredSession);

  // Re-check session validity on mount
  useEffect(() => {
    const stored = getStoredSession();
    setSession(stored);
  }, []);

  const saveSession = useCallback((email: string, token: string) => {
    const newSession: RegistrationSession = {
      email,
      sessionToken: token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    queryClient.removeQueries({ queryKey: ['registration-orders'] });
  }, [queryClient]);

  // Create checkout session
  const createCheckout = useMutation({
    mutationFn: async (data: RegistrationCheckoutRequest) => {
      const { data: result, error } = await supabase.functions.invoke(
        'create-registration-checkout',
        { body: data }
      );
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result as { url?: string; redirect_url?: string; order_id: string; order_number: string };
    },
    onError: (error) => {
      toast.error('Checkout failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  // Verify payment after Stripe redirect
  const verifyPayment = useMutation({
    mutationFn: async (data: { order_id: string; session_id?: string }) => {
      const { data: result, error } = await supabase.functions.invoke(
        'verify-registration-payment',
        { body: data }
      );
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result as VerifyPaymentResponse;
    },
  });

  // Send OTP code
  const sendOtp = useMutation({
    mutationFn: async (email: string) => {
      const { data: result, error } = await supabase.functions.invoke(
        'send-registration-otp',
        { body: { email } }
      );
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result as { success: boolean; message: string };
    },
    onError: (error) => {
      toast.error('Failed to send code', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  // Verify OTP code
  const verifyOtp = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const { data: result, error } = await supabase.functions.invoke(
        'verify-registration-otp',
        { body: data }
      );
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result as {
        valid: boolean;
        session_token?: string;
        registrations?: RegistrationOrder[];
        error?: string;
      };
    },
    onSuccess: (data) => {
      if (data.valid && data.session_token) {
        // Session will be saved by the calling component
      }
    },
    onError: (error) => {
      toast.error('Verification failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  // Fetch orders (requires valid session)
  const ordersQuery = useQuery({
    queryKey: ['registration-orders', session?.email],
    queryFn: async (): Promise<RegistrationOrder[]> => {
      if (!session) return [];
      const { data: result, error } = await supabase.functions.invoke(
        'get-registration-orders',
        {
          body: {
            email: session.email,
            session_token: session.sessionToken,
          },
        }
      );
      if (error) throw error;
      if (result.error) {
        // Session expired
        if (result.error.includes('Session expired')) {
          clearSession();
        }
        throw new Error(result.error);
      }
      return result.registrations || [];
    },
    enabled: !!session,
    staleTime: 1000 * 60, // 1 minute
  });

  // Update attendee
  const updateAttendee = useMutation({
    mutationFn: async (data: {
      attendee_id: string;
      attendee_name: string;
      attendee_email: string;
      is_purchaser?: boolean;
    }) => {
      if (!session) throw new Error('Not verified');
      const { data: result, error } = await supabase.functions.invoke(
        'update-registration-attendee',
        {
          body: {
            email: session.email,
            session_token: session.sessionToken,
            ...data,
          },
        }
      );
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-orders'] });
      toast.success('Attendee updated');
    },
    onError: (error) => {
      toast.error('Failed to update attendee', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  // Send registration forms to attendees
  const sendForms = useMutation({
    mutationFn: async (attendee_ids: string[]) => {
      if (!session) throw new Error('Not verified');
      const { data: result, error } = await supabase.functions.invoke(
        'send-registration-forms',
        {
          body: {
            email: session.email,
            session_token: session.sessionToken,
            attendee_ids,
          },
        }
      );
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registration-orders'] });
      const count = data.attendees?.length || 0;
      toast.success(`Registration forms sent to ${count} attendee${count !== 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error('Failed to send forms', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  return {
    // Session
    session,
    isVerified: !!session,
    email: session?.email ?? null,
    saveSession,
    clearSession,

    // Mutations
    createCheckout,
    verifyPayment,
    sendOtp,
    verifyOtp,
    updateAttendee,
    sendForms,

    // Orders query
    orders: ordersQuery.data ?? [],
    ordersLoading: ordersQuery.isLoading,
    ordersError: ordersQuery.error,
    refetchOrders: ordersQuery.refetch,
  };
}
