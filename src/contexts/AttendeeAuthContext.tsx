import React, { createContext, useContext, ReactNode } from 'react';
import { useOrderPortal, PortalOrder } from '@/hooks/useOrderPortal';

// Re-export PortalOrder type
export type { PortalOrder };

interface AttendeeAuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  loading: boolean;
  error: string | null;
  logout: () => void;
  orders: PortalOrder[];
  fetchOrders: () => Promise<void>;
}

const AttendeeAuthContext = createContext<AttendeeAuthContextType | undefined>(undefined);

export function AttendeeAuthProvider({ children }: { children: ReactNode }) {
  const orderPortal = useOrderPortal();

  const value: AttendeeAuthContextType = {
    isAuthenticated: orderPortal.isAuthenticated,
    email: orderPortal.email,
    loading: orderPortal.loading,
    error: orderPortal.error,
    logout: orderPortal.logout,
    orders: orderPortal.orders,
    fetchOrders: orderPortal.fetchOrders,
  };

  return (
    <AttendeeAuthContext.Provider value={value}>
      {children}
    </AttendeeAuthContext.Provider>
  );
}

export function useAttendeeAuth() {
  const context = useContext(AttendeeAuthContext);
  if (context === undefined) {
    throw new Error('useAttendeeAuth must be used within an AttendeeAuthProvider');
  }
  return context;
}
