import { useState } from 'react';
import { PollCard as PollCardType } from '@/types/conferenceFeed';
import { Lock, Check } from 'lucide-react';

interface PollCardProps {
  poll: PollCardType;
  onVote: (optionId: string) => void;
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(poll.answered);

  const handleSelect = (optionId: string) => {
    if (poll.answered || selectedId) return;
    
    setSelectedId(optionId);
    
    // Delay to show selection, then vote
    setTimeout(() => {
      onVote(optionId);
      setTimeout(() => {
        setShowResults(true);
      }, 300);
    }, 300);
  };

  const getPercentage = (votes: number) => {
    const total = poll.totalVotes + (selectedId && !poll.answered ? 1 : 0);
    return Math.round((votes / total) * 100);
  };

  return (
    <div className="relative h-full w-full bg-[#09090b] overflow-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${poll.accentColor}15 0%, transparent 70%)`,
        }}
      />
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[360px] px-6">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div 
            className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${poll.accentColor}20`,
              color: poll.accentColor,
            }}
          >
            📊 Quick Poll
          </div>
        </div>

        {/* Question */}
        <h2 
          className="text-[21px] font-black text-center text-[#f0f0f2] mb-6"
          style={{ fontFamily: 'Figtree, sans-serif' }}
        >
          {poll.question}
        </h2>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {poll.options.map((option) => {
            const isSelected = selectedId === option.id || poll.selectedOption === option.id;
            const percentage = getPercentage(isSelected && selectedId && !poll.answered ? option.votes + 1 : option.votes);
            
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={!!selectedId || poll.answered}
                className="relative w-full py-3 px-4 rounded-xl border text-left transition-all overflow-hidden"
                style={{
                  backgroundColor: showResults && isSelected ? `${poll.accentColor}15` : '#111114',
                  borderColor: isSelected ? poll.accentColor : '#1e1e24',
                  transform: selectedId === option.id && !showResults ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                {/* Fill Bar (shown after voting) */}
                {showResults && (
                  <div
                    className="absolute inset-0 transition-all duration-800 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isSelected ? `${poll.accentColor}25` : 'rgba(255,255,255,0.05)',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{option.emoji}</span>
                    <span 
                      className="text-[13px] font-medium"
                      style={{ color: isSelected ? '#f0f0f2' : '#a1a1aa' }}
                    >
                      {option.text}
                    </span>
                  </div>

                  {showResults ? (
                    <span 
                      className="text-[13px] font-bold"
                      style={{ color: isSelected ? poll.accentColor : '#a1a1aa' }}
                    >
                      {percentage}%
                    </span>
                  ) : isSelected ? (
                    <Check className="w-4 h-4" style={{ color: poll.accentColor }} />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Vote Count */}
        <p className="text-[12px] text-center text-white/40 mb-4">
          {showResults 
            ? `${poll.totalVotes + (selectedId && !poll.answered ? 1 : 0)} votes`
            : `${poll.totalVotes} votes so far`
          }
        </p>

        {/* Source + Time */}
        <p className="text-[11px] text-center text-white/30 mb-4">
          {poll.from} · {poll.date} · {poll.time}
        </p>

        {/* Lock Hint */}
        {!poll.answered && !selectedId && (
          <div className="flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-white/30" />
            <span className="text-[11px] text-white/30">
              Vote to continue scrolling
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
