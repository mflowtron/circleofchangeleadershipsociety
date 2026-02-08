import { FeedItem, isBlockingCard } from '@/types/conferenceFeed';

interface ScrollDotsProps {
  items: FeedItem[];
  activeIndex: number;
  totalCount: number;
}

const getAccentColor = (item: FeedItem): string => {
  if (item.cardType === 'announcement') return '#3b82f6';
  if (item.cardType === 'poll') return '#8b5cf6';
  if (item.cardType === 'videoask') return '#ef4444';
  return '#ffffff';
};

export function ScrollDots({ items, activeIndex, totalCount }: ScrollDotsProps) {
  return (
    <div 
      className="fixed right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-[3px]"
    >
      {Array.from({ length: totalCount }).map((_, index) => {
        const isActive = index === activeIndex;
        const item = items[index];
        const isInterstitial = item && isBlockingCard(item);
        const color = item ? getAccentColor(item) : '#ffffff';

        return (
          <div
            key={index}
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
            }}
          />
        );
      })}
    </div>
  );
}
