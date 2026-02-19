import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WatchProgress {
  position_seconds: number;
  duration_seconds: number;
}

export function useWatchProgress(recordingId: string) {
  const { user } = useAuth();
  const [startPosition, setStartPosition] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const lastSavedRef = useRef<number>(0);

  // Fetch saved position on mount
  useEffect(() => {
    if (!user?.id || !recordingId) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data } = await supabase
          .from('recording_watch_progress')
          .select('position_seconds, duration_seconds')
          .eq('user_id', user.id)
          .eq('recording_id', recordingId)
          .maybeSingle();

        if (data) {
          // If they've watched 95%+, start from beginning
          const pct = data.duration_seconds > 0
            ? data.position_seconds / data.duration_seconds
            : 0;
          setStartPosition(pct >= 0.95 ? 0 : data.position_seconds);
        }
      } catch (err) {
        console.error('Error fetching watch progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user?.id, recordingId]);

  // Save progress (throttled externally by caller)
  const saveProgress = useCallback(async (position: number, duration: number) => {
    if (!user?.id || !recordingId || duration <= 0) return;

    try {
      await supabase
        .from('recording_watch_progress')
        .upsert({
          user_id: user.id,
          recording_id: recordingId,
          position_seconds: position,
          duration_seconds: duration,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,recording_id' });
    } catch (err) {
      console.error('Error saving watch progress:', err);
    }
  }, [user?.id, recordingId]);

  return { startPosition, loading: loading, saveProgress, lastSavedRef };
}

/** Fetch all watch progress for the current user (for progress bars on cards) */
export function useAllWatchProgress() {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});

  useEffect(() => {
    if (!user?.id) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('recording_watch_progress')
        .select('recording_id, position_seconds, duration_seconds')
        .eq('user_id', user.id);

      if (data) {
        const map: Record<string, WatchProgress> = {};
        for (const row of data) {
          map[row.recording_id] = {
            position_seconds: row.position_seconds,
            duration_seconds: row.duration_seconds,
          };
        }
        setProgressMap(map);
      }
    };

    fetch();
  }, [user?.id]);

  return progressMap;
}
