

# Infinite Feed with Soft-Nudge Interstitials

## Overview

This update transforms the conference feed from a blocking scroll model to an **infinite scrolling experience**. Instead of locking users at polls, announcements, and video feedback requests, the feed now allows free scrolling with soft nudges that encourage engagement. Skipped interstitials resurface later with escalating prompts, while resolved ones are permanently retired.

## What Changes

### User Experience

| Scenario | Before | After |
|----------|--------|-------|
| Reaching a poll | Scroll locked until vote | Scroll freely, see soft nudge |
| Scrolling past poll without voting | Impossible (blocked) | Poll reappears 6-10 cards later with stronger nudge |
| Voting on poll | Unlocks, auto-advances | Poll marked done, never shown again |
| Scrolling past all content | Hits "all caught up" dead-end | Feed loops with liked posts + resurfaced interstitials |
| Skipping same poll 3 times | N/A | Poll shows clean (no nudge), won't resurface again |
| Two polls back-to-back | Possible | Never — 4-card minimum gap enforced |

## Implementation

### Step 1: Create View State Tracking Type

Add new types to track how users interact with each feed item.

**New file: `src/types/feedViewState.ts`**

```text
┌────────────────────────────────────┐
│     FeedItemViewState              │
├────────────────────────────────────┤
│ viewCount: number                  │
│ lastViewedAt: timestamp | null     │
│ interacted: boolean                │
│ skippedAt: timestamp | null        │
│ nudgeLevel: 0 | 1 | 2 | 3          │
└────────────────────────────────────┘
```

### Step 2: Create NudgeBanner Component

A reusable soft-nudge component shown on resurfaced interstitials.

**New file: `src/components/attendee/feed/NudgeBanner.tsx`**

- Subtle glass-morphism banner
- Color-matched to card accent
- Slide-down entrance animation
- `subtle` variant for first appearance

### Step 3: Create Loading Card Component

Replaces the "end of feed" card with an infinite loading state.

**New file: `src/components/attendee/feed/cards/LoadingCard.tsx`**

- Spinner animation
- "Loading more moments..." text
- Appears while next batch is being built

### Step 4: Update Scroll Dots for Windowed Display

**Modify: `src/components/attendee/feed/ScrollDots.tsx`**

- Show only 11 dots centered on active card (±5 from current)
- Fade dots at edges of the window
- Prevents infinite dot column growth

### Step 5: Update Interstitial Cards — Remove Lock Hints, Add Nudges

**Modify: `src/components/attendee/feed/cards/PollCard.tsx`**

- Remove "🔒 Vote to continue scrolling" lock hint
- Add `NudgeBanner` with escalating messages based on nudge level:
  - Level 0: "📊 Quick — your voice matters!" (subtle)
  - Level 1: "📊 You haven't voted yet — X others have!"
  - Level 2+: No nudge (clean display)

**Modify: `src/components/attendee/feed/cards/AnnouncementCard.tsx`**

- Remove "🔒 Acknowledge to continue scrolling" lock hint
- Add `NudgeBanner` for resurfaced announcements:
  - Level 1+: "📢 You may have missed this update"

**Modify: `src/components/attendee/feed/cards/VideoAskCard.tsx`**

- Remove "🔒 Record or skip to continue" lock hint
- Add `NudgeBanner` for resurfaced video asks:
  - Level 1: "🎥 Still time to share your take!"

### Step 6: Refactor ConferenceFeed with Infinite Queue

**Modify: `src/components/attendee/feed/ConferenceFeed.tsx`**

Major changes:

1. **Remove scroll-blocking logic:**
   - Delete `isBlocked` state
   - Delete `handleScroll` callback that snaps back to active index
   - Delete scroll event listener attachment
   - Delete `<ScrollLockIndicator>` component usage
   - Delete auto-advance after interaction

2. **Add view state tracking:**
   - New `viewStates` Map state
   - Track `viewCount`, `lastViewedAt` when active card changes
   - Track `skippedAt` when user scrolls past unresolved interstitial
   - Set `interacted: true` in action handlers

3. **Implement infinite queue:**
   - New `renderedQueue` state (starts with initial batch)
   - `buildNextBatch()` function that:
     - Prioritizes unseen content first
     - Resurfaces skipped interstitials with incremented nudge level
     - Fills with high-engagement replays
     - Enforces 4-card minimum gap between interstitials
   - Load more when within 4 cards of the end

4. **Pass nudge level to card components:**
   - Props drilling or context for view states

### Step 7: Delete Obsolete Components

**Delete: `src/components/attendee/feed/ScrollLockIndicator.tsx`**

**Delete: `src/components/attendee/feed/EndOfFeedCard.tsx`**

### Step 8: Add Required Keyframe Animations

**Modify: `tailwind.config.ts`**

Add new keyframes:
- `slide-down`: For nudge banner entrance
- `spin`: For loading spinner

## Files Summary

| Action | File |
|--------|------|
| Create | `src/types/feedViewState.ts` |
| Create | `src/components/attendee/feed/NudgeBanner.tsx` |
| Create | `src/components/attendee/feed/cards/LoadingCard.tsx` |
| Modify | `src/components/attendee/feed/ScrollDots.tsx` |
| Modify | `src/components/attendee/feed/cards/PollCard.tsx` |
| Modify | `src/components/attendee/feed/cards/AnnouncementCard.tsx` |
| Modify | `src/components/attendee/feed/cards/VideoAskCard.tsx` |
| Modify | `src/components/attendee/feed/ConferenceFeed.tsx` |
| Modify | `tailwind.config.ts` |
| Delete | `src/components/attendee/feed/ScrollLockIndicator.tsx` |
| Delete | `src/components/attendee/feed/EndOfFeedCard.tsx` |

## Technical Details

### Queue Building Algorithm

```text
buildNextBatch(count):
  1. Collect unseen items (viewCount === 0)
  2. Collect skipped interstitials (skippedAt && !interacted && nudgeLevel < 3)
  3. Collect replayable posts (seen, not interstitials)
  4. Sort replayable by: liked first, then by like count
  
  Fill batch:
  - Shuffle and add unseen items
  - Sprinkle skipped interstitials (increment nudgeLevel)
  - Fill remainder with replayable posts
  - Enforce 4-card gap between interstitials
```

### Skip Detection

When `activeIndex` changes forward and the previous card was an unresolved interstitial, mark it as skipped:

```text
if (prevItem is interstitial && !interacted && newIndex > prevIndex):
  setSkippedAt(now)
```

### View State Persistence

States are kept in React state during the session. When an interstitial resurfaces, its `nudgeLevel` increments and `skippedAt` resets to null. After 3 resurfaces with no interaction, the item is retired from the queue.

