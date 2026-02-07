

# Prevent Scrollbar Jump When Switching Feed Tabs

## Problem

When switching between "All Posts", "My Chapter", and "My Posts" tabs, the scrollbar appears and disappears based on content height. This causes:
1. A visual "jump" as the content area width changes
2. An inconsistent user experience

## Root Cause

The `main` element in `AppLayout.tsx` uses `overflow-y-auto`, which only shows the scrollbar when content exceeds the viewport height. Different tab filters return different amounts of posts, causing the scrollbar to toggle.

## Solution

Change from `overflow-y-auto` to `overflow-y-scroll` on the main content area. This keeps the scrollbar always visible (or reserves space for it), preventing layout shifts when content height changes.

---

## File to Modify

### `src/components/layout/AppLayout.tsx`

**Line 40** - Update the main element's overflow class:

| Before | After |
|--------|-------|
| `overflow-y-auto` | `overflow-y-scroll` |

This ensures the scrollbar space is always reserved, preventing the content from shifting when switching between tabs with different amounts of content.

---

## Alternative Consideration

If the always-visible scrollbar looks undesirable (especially on Windows where scrollbars are more prominent), we could instead use CSS `scrollbar-gutter: stable` which reserves space without showing the scrollbar track. However, this has limited browser support. The `overflow-y-scroll` approach is more universally compatible.

