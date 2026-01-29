import { useState, useEffect, useCallback } from 'react';

export interface TranscriptCue {
  startTime: number;  // seconds
  endTime: number;    // seconds
  text: string;
}

function parseTimestamp(timestamp: string): number {
  // Parse VTT timestamp format: HH:MM:SS.mmm or MM:SS.mmm
  const parts = timestamp.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function parseVTT(vttContent: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  
  // Split by double newlines to get cue blocks
  // Handle both \n\n and \r\n\r\n
  const blocks = vttContent.split(/\r?\n\r?\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    
    // Skip WEBVTT header and NOTE blocks
    if (lines[0] === 'WEBVTT' || lines[0].startsWith('NOTE')) {
      continue;
    }
    
    // Find the timestamp line (contains -->)
    let timestampLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIndex = i;
        break;
      }
    }
    
    if (timestampLineIndex === -1) continue;
    
    const timestampLine = lines[timestampLineIndex];
    const timestampMatch = timestampLine.match(
      /(\d{1,2}:)?(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2}\.\d{3})/
    );
    
    if (!timestampMatch) continue;
    
    // Parse start and end times
    const startPart = timestampLine.split('-->')[0].trim();
    const endPart = timestampLine.split('-->')[1].trim().split(' ')[0]; // Remove any positioning
    
    const startTime = parseTimestamp(startPart);
    const endTime = parseTimestamp(endPart);
    
    // Get the text content (everything after the timestamp line)
    const textLines = lines.slice(timestampLineIndex + 1);
    const text = textLines.join(' ').trim();
    
    if (text) {
      cues.push({ startTime, endTime, text });
    }
  }
  
  return cues;
}

export function useTranscript(playbackId: string | null, trackId: string | null) {
  const [cues, setCues] = useState<TranscriptCue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscript = useCallback(async () => {
    if (!playbackId || !trackId) {
      setCues([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch VTT file from Mux
      const vttUrl = `https://stream.mux.com/${playbackId}/text/${trackId}.vtt`;
      const response = await fetch(vttUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`);
      }

      const vttContent = await response.text();
      const parsedCues = parseVTT(vttContent);
      setCues(parsedCues);
    } catch (err) {
      console.error('Error fetching transcript:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
      setCues([]);
    } finally {
      setLoading(false);
    }
  }, [playbackId, trackId]);

  useEffect(() => {
    fetchTranscript();
  }, [fetchTranscript]);

  return { cues, loading, error, refetch: fetchTranscript };
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
