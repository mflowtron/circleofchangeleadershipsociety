import { FeedItem, isBlockingCard } from '@/types/conferenceFeed';

interface ScrollDotsProps {
  items: FeedItem[];
  activeIndex: number;
  totalCount: number;
}

const DOT_WINDOW = 5; // show 5 above and 5 below active

const getAccentColor = (item: FeedItem): string => {
  if (item.cardType === 'announcement') return '#3b82f6';
  if (item.cardType === 'poll') return '#8b5cf6';
  if (item.cardType === 'videoask') return '#ef4444';
  return '#ffffff';
};

export function ScrollDots({ items, activeIndex, totalCount }: ScrollDotsProps) {
  // Calculate windowed range centered on active card
  const dotStart = Math.max(0, activeIndex - DOT_WINDOW);
  const dotEnd = Math.min(totalCount - 1, activeIndex + DOT_WINDOW);

  return (
    <div 
      className="fixed right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-[3px]"
    >
      {Array.from({ length: dotEnd - dotStart + 1 }).map((_, i) => {
        const globalIndex = dotStart + i;
        const isActive = globalIndex === activeIndex;
        const item = items[globalIndex];
        const isInterstitial = item && isBlockingCard(item);
        const color = item ? getAccentColor(item) : '#ffffff';
        
        // Fade dots at edges of the window
        const distFromActive = Math.abs(globalIndex - activeIndex);
        const opacity = distFromActive <= 1 ? 1 : distFromActive <= 3 ? 0.6 : 0.3;

        return (
          <div
            key={globalIndex}
            className="transition-all duration-300"
            style={{
              width: isInterstitial ? '5px' : '3px',
              height: isActive ? '14px' : isInterstitial ? '8px' : '5px',
              backgroundColor: isActive 
                ? color 
                : isInterstitial 
                  ? `${color}80` 
                  : 'rgba(255,255,255,0.4)',
              borderRadius: '999px',
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}
