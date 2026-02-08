import { useState } from 'react';
import { Camera, Search } from 'lucide-react';

type TabType = 'following' | 'latest' | 'trending';

export function FeedHeader() {
  const [activeTab, setActiveTab] = useState<TabType>('latest');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'following', label: 'Following' },
    { id: 'latest', label: 'Latest' },
    { id: 'trending', label: 'Trending' },
  ];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-30 pt-safe"
      style={{
        background: 'linear-gradient(to bottom, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.7) 70%, transparent 100%)',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Camera Button */}
        <button className="w-[34px] h-[34px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Camera className="w-[18px] h-[18px] text-white" />
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative py-1"
            >
              <span 
                className={`text-[15px] transition-all ${
                  activeTab === tab.id 
                    ? 'text-white font-extrabold' 
                    : 'text-white/40 font-medium'
                }`}
              >
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-white"
                />
              )}
            </button>
          ))}
        </div>

        {/* Search Button */}
        <button className="w-[34px] h-[34px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Search className="w-[18px] h-[18px] text-white" />
        </button>
      </div>
    </div>
  );
}
