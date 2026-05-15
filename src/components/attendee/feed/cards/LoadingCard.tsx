export function LoadingCard() {
  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col items-center justify-center gap-3">
      <div 
        className="w-10 h-10 rounded-full border-[3px] border-white/5 animate-spin"
        style={{ borderTopColor: 'hsl(var(--primary))' }}
      />
      <span 
        className="text-[13px] text-zinc-600 font-medium"
        style={{ fontFamily: "'Instrument Sans', sans-serif" }}
      >
        Loading more moments...
      </span>
    </div>
  );
}
