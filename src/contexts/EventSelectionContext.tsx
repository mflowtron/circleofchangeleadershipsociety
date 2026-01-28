import { createContext, useContext, useState, ReactNode } from 'react';

interface EventSelectionContextType {
  selectedEventIds: string[];
  setSelectedEventIds: (ids: string[]) => void;
  clearSelection: () => void;
  hasSelection: boolean;
}

const EventSelectionContext = createContext<EventSelectionContextType | undefined>(undefined);

export function EventSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const clearSelection = () => setSelectedEventIds([]);
  const hasSelection = selectedEventIds.length > 0;

  return (
    <EventSelectionContext.Provider
      value={{
        selectedEventIds,
        setSelectedEventIds,
        clearSelection,
        hasSelection,
      }}
    >
      {children}
    </EventSelectionContext.Provider>
  );
}

export function useEventSelection() {
  const context = useContext(EventSelectionContext);
  if (!context) {
    throw new Error('useEventSelection must be used within EventSelectionProvider');
  }
  return context;
}
