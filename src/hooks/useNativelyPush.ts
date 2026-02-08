import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Check if we're in a Natively environment
const isNativelyEnvironment = () => {
  try {
    return typeof window !== 'undefined' && 
           'natively' in window && 
           typeof (window as any).natively?.notifications !== 'undefined';
  } catch {
    return false;
  }
};

export interface NativelyPushState {
  isSupported: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  playerId: string | null;
}

export function useNativelyPush(userId?: string | null) {
  const [state, setState] = useState<NativelyPushState>({
    isSupported: false,
    isRegistered: false,
    isLoading: true,
    error: null,
    playerId: null,
  });

  const registerPlayerId = useCallback(async (playerId: string, targetUserId?: string) => {
    try {
      const { error } = await supabase.functions.invoke('register-push-token', {
        body: { 
          player_id: playerId,
          user_id: targetUserId 
        },
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isRegistered: true,
        playerId,
        error: null,
      }));

      return true;
    } catch (err: any) {
      console.error('Failed to register push token:', err);
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to register push token',
      }));
      return false;
    }
  }, []);

  const initializePush = useCallback(async () => {
    if (!isNativelyEnvironment()) {
      setState(prev => ({
        ...prev,
        isSupported: false,
        isLoading: false,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const natively = (window as any).natively;
      
      // Check if notifications are available
      if (!natively?.notifications) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      // Request notification permission
      const permissionGranted = await new Promise<boolean>((resolve) => {
        try {
          natively.notifications.requestPermission((granted: boolean) => {
            resolve(granted);
          });
        } catch {
          resolve(false);
        }
      });

      if (!permissionGranted) {
        setState(prev => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          error: 'Notification permission denied',
        }));
        return;
      }

      // Get the OneSignal player ID
      const playerId = await new Promise<string | null>((resolve) => {
        try {
          natively.notifications.getPlayerId((id: string | null) => {
            resolve(id);
          });
        } catch {
          resolve(null);
        }
      });

      if (!playerId) {
        setState(prev => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          error: 'Failed to get player ID',
        }));
        return;
      }

      // Register the player ID with our backend
      if (userId) {
        await registerPlayerId(playerId, userId);
      } else {
        setState(prev => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          playerId,
        }));
      }

    } catch (err: any) {
      console.error('Failed to initialize push notifications:', err);
      setState(prev => ({
        ...prev,
        isSupported: false,
        isLoading: false,
        error: err.message || 'Failed to initialize push notifications',
      }));
    }
  }, [userId, registerPlayerId]);

  // Auto-initialize on mount
  useEffect(() => {
    initializePush();
  }, [initializePush]);

  // Re-register when userId changes
  useEffect(() => {
    if (state.playerId && userId && !state.isRegistered) {
      registerPlayerId(state.playerId, userId);
    }
  }, [userId, state.playerId, state.isRegistered, registerPlayerId]);

  return {
    ...state,
    initializePush,
    registerPlayerId,
  };
}
