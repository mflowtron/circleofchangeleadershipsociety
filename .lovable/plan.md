
# Fix Messages Tab Intermittent Empty State

## Status: ✅ COMPLETED

## Problem

The Messages tab sometimes shows "Start connecting!" (empty state) even when conversations exist. This was a race condition caused by multiple independent hook instances and transient null context values.

## Solution Implemented

Lifted conversation state into `AttendeeContext` so all components share a single source of truth.

### Changes Made

1. **`src/contexts/AttendeeContext.tsx`**
   - Added conversation types (`Conversation`, `ConversationParticipant`, `LastMessage`)
   - Added state: `conversations`, `conversationsLoading`, `conversationsError`
   - Added `conversationIdsRef` to stabilize realtime subscription
   - Added `refreshConversations` callback that skips fetch instead of clearing data on null deps
   - Added realtime subscription with stable dependencies
   - Export all conversation state and methods

2. **`src/hooks/useConversations.ts`**
   - Converted to thin wrapper that reads from `AttendeeContext`
   - Re-exports types for backward compatibility
   - Same API maintained for existing consumers

### Why This Fixes the Issue

| Previous Problem | Solution |
|-----------------|----------|
| 3 hook instances with independent state | Single state in context, shared by all |
| `setConversations([])` on null deps | Skip fetch instead of clearing data |
| Subscription depends on conversations array | Use ref for stable dependency |

### Behavioral Change

- Conversations are fetched once when `selectedAttendee` changes, then shared
- Navigating between tabs doesn't trigger new fetches or show loading states
- Realtime updates still work but don't cause subscription churn
