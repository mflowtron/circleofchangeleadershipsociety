import { useState, useEffect, useRef } from 'react';
import { VideoAskCard as VideoAskCardType } from '@/types/conferenceFeed';
import { Check, Video, Square } from 'lucide-react';
import { NudgeBanner } from '../NudgeBanner';

interface VideoAskCardProps {
  videoAsk: VideoAskCardType;
  nudgeLevel?: number;
  onRespond: () => void;
  onSkip: () => void;
}

export function VideoAskCard({ videoAsk, nudgeLevel = 0, onRespond, onSkip }: VideoAskCardProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(videoAsk.responded);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleRecord = () => {
    // Start countdown
    setCountdown(3);
  };

  // Handle countdown
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      setCountdown(null);
      setRecording(true);
      setSeconds(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRecording(false);
    setRecorded(true);
    onRespond();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show nudge only on first resurface (nudgeLevel === 1) and if not responded
  const showNudge = !recorded && !recording && countdown === null && nudgeLevel === 1;

  return (
    <div className="relative h-full w-full bg-[#09090b] overflow-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${videoAsk.accentColor}15 0%, transparent 70%)`,
        }}
      />
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <span 
            className="text-[120px] font-black animate-pulse"
            style={{ 
              color: videoAsk.accentColor,
              textShadow: `0 0 60px ${videoAsk.accentColor}`,
            }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-[340px] px-6">
        {/* Nudge Banner */}
        {showNudge && (
          <NudgeBanner 
            text="🎥 Still time to share your take!" 
            color={videoAsk.accentColor} 
          />
        )}

        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div 
            className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${videoAsk.accentColor}20`,
              color: videoAsk.accentColor,
            }}
          >
            🎥 Video Feedback
          </div>
        </div>

        {/* Camera Preview Area */}
        <div 
          className="aspect-square rounded-[20px] mb-6 flex flex-col items-center justify-center transition-all duration-300"
          style={{
            backgroundColor: '#111114',
            border: recording ? `3px solid ${videoAsk.accentColor}` : '1px solid #1e1e24',
            boxShadow: recording ? `0 0 30px ${videoAsk.accentColor}30` : 'none',
          }}
        >
          {recorded ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <span className="text-[16px] font-bold text-green-500">Response recorded!</span>
              <span className="text-[12px] text-white/50 mt-1">Thank you for sharing</span>
            </>
          ) : recording ? (
            <>
              {/* REC indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[12px] font-bold text-red-500">REC</span>
              </div>
              {/* Timer */}
              <div className="absolute top-4 right-4">
                <span className="text-[12px] font-mono text-white/70">
                  {formatTime(seconds)} / 1:00
                </span>
              </div>
              {/* Camera icon during recording */}
              <Video className="w-16 h-16 text-white/30 mb-3" />
              <span className="text-[14px] text-white/50">Recording...</span>
            </>
          ) : (
            <>
              <span className="text-5xl mb-3">📹</span>
              <span className="text-[13px] text-white/40">Camera preview</span>
            </>
          )}
        </div>

        {/* Prompt Question */}
        <h2 
          className="text-[19px] font-black text-center text-[#f0f0f2] mb-3"
          style={{ fontFamily: 'Figtree, sans-serif' }}
        >
          {videoAsk.prompt}
        </h2>

        {/* Subtitle */}
        <p className="text-[12.5px] text-center text-[#a1a1aa] leading-relaxed mb-6">
          {videoAsk.subtitle}
        </p>

        {/* Action Buttons */}
        {!recorded && !recording && countdown === null && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleRecord}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${videoAsk.accentColor} 0%, ${videoAsk.accentColor}cc 100%)`,
                boxShadow: `0 4px 20px -4px ${videoAsk.accentColor}50`,
              }}
            >
              <span>⏺</span> Record
            </button>
            {videoAsk.skippable && (
              <button
                onClick={onSkip}
                className="px-6 py-3 rounded-xl text-[14px] font-semibold text-white/70 border border-white/20 hover:bg-white/5 transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        )}

        {/* Stop Recording Button */}
        {recording && (
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white mb-4"
            style={{
              background: videoAsk.accentColor,
            }}
          >
            <Square className="w-4 h-4 fill-white" /> Stop Recording
          </button>
        )}

        {/* Source + Time */}
        <p className="text-[11px] text-center text-white/30">
          {videoAsk.from} · {videoAsk.date} · {videoAsk.time}
        </p>
      </div>
    </div>
  );
}
