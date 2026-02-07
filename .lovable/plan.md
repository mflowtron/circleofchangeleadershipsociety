
# Suppress Native Text Selection on Message Bubbles

## Overview

A simple CSS fix to prevent mobile browsers from triggering text selection when users long-press on message bubbles. This keeps the existing tap-and-hold gesture for reactions working properly.

---

## Solution

Add two changes to the message bubble containers:

1. **CSS class `select-none`** - Applies `user-select: none` to prevent text selection
2. **Inline style `WebkitTouchCallout: 'none'`** - Prevents iOS callout menu (copy/paste popup)

These changes apply to both own messages (line 100) and received messages (line 179).

---

## Technical Changes

### File: `src/components/attendee/MessageBubble.tsx`

**Own messages container (line 100):**
```tsx
// Before
<div 
  className="max-w-[80%] relative"
  onTouchStart={handleTouchStart}
  ...
>

// After
<div 
  className="max-w-[80%] relative select-none"
  style={{ WebkitTouchCallout: 'none' }}
  onTouchStart={handleTouchStart}
  ...
>
```

**Received messages container (line 179):**
```tsx
// Before
<div 
  className="max-w-[80%] relative"
  onTouchStart={handleTouchStart}
  ...
>

// After
<div 
  className="max-w-[80%] relative select-none"
  style={{ WebkitTouchCallout: 'none' }}
  onTouchStart={handleTouchStart}
  ...
>
```

---

## What These CSS Properties Do

| Property | Effect |
|----------|--------|
| `select-none` (Tailwind) | Applies `user-select: none` - prevents text selection on all browsers |
| `WebkitTouchCallout: 'none'` | iOS-specific - prevents the callout menu that appears on long-press |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/MessageBubble.tsx` | Add `select-none` class and `WebkitTouchCallout` style to both message container divs |

This is a minimal 2-line change that preserves the existing long-press behavior while preventing the native text selection conflict on mobile.
