interface NudgeBannerProps {
  text: string;
  color: string;
  subtle?: boolean;
}

export function NudgeBanner({ text, color, subtle }: NudgeBannerProps) {
  return (
    <div className="flex justify-center mb-3 animate-slide-down">
      <div 
        className="rounded-xl px-4 py-1.5 max-w-[280px] backdrop-blur-sm"
        style={{
          background: subtle ? `${color}08` : `${color}12`,
          border: `1px solid ${color}${subtle ? '10' : '20'}`,
        }}
      >
        <span 
          className="text-[12px] font-semibold text-center block"
          style={{ 
            color: subtle ? `${color}90` : color,
            fontFamily: "'Figtree', sans-serif",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
