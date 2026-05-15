import { ReactNode } from 'react';
import { AttendeeAuthProvider } from './AttendeeAuthContext';
import { AttendeeEventProvider } from './AttendeeEventContext';
import { BookmarksProvider } from './BookmarksContext';
import { ConversationsProvider } from './ConversationsContext';

export function AttendeeProviders({ children }: { children: ReactNode }) {
  return (
    <AttendeeAuthProvider>
      <AttendeeEventProvider>
        <BookmarksProvider>
          <ConversationsProvider>
            {children}
          </ConversationsProvider>
        </BookmarksProvider>
      </AttendeeEventProvider>
    </AttendeeAuthProvider>
  );
}
