import { Home, Compass, Plus, Calendar, User } from 'lucide-react';

export function FeedBottomNav() {
  const navItems = [
    { id: 'feed', icon: Home, label: 'Feed', active: true },
    { id: 'discover', icon: Compass, label: 'Discover', active: false },
    { id: 'create', icon: Plus, label: '', active: false, isCreate: true },
    { id: 'schedule', icon: Calendar, label: 'Schedule', active: false },
    { id: 'profile', icon: User, label: 'Profile', active: false },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: 'linear-gradient(to top, rgba(9,9,11,0.98) 0%, rgba(9,9,11,0.85) 60%, transparent 100%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-4 py-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`flex flex-col items-center gap-1 ${
              item.isCreate ? '' : 'min-w-[50px]'
            }`}
          >
            {item.isCreate ? (
              <div 
                className="w-11 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                }}
              >
                <Plus className="w-5 h-5 text-black stroke-[3px]" />
              </div>
            ) : (
              <>
                <item.icon 
                  className={`w-5 h-5 ${
                    item.active ? 'text-white' : 'text-white/30'
                  }`}
                />
                <span 
                  className={`text-[9px] font-bold ${
                    item.active ? 'text-white' : 'text-white/30'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
