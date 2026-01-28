import { createContext, useContext, useState, ReactNode } from 'react';

interface EventSelectionContextType {
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  clearSelection: () => void;
  hasSelection: boolean;
}

const EventSelectionContext = createContext<EventSelectionContextType | undefined>(undefined);

export function EventSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const clearSelection = () => setSelectedEventId(null);
  const hasSelection = selectedEventId !== null;

  return (
    <EventSelectionContext.Provider
      value={{
        selectedEventId,
        setSelectedEventId,
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
