

# Fix: Persistent Content Shift After Fullscreen Exit in Natively App

## Problem Summary

When exiting fullscreen video in the **Recordings player** within the Natively iOS wrapper, the entire page content (including the header) shifts down, creating a large blank gap at the top. This issue:
- Only occurs in the Natively app (not PWA)
- Affects everything - header shifts down too
- Persists until the screen is re-opened
- Cannot be fixed by scrolling

## Root Cause Analysis

The current fix (`useFullscreenScrollFix`) has multiple issues:

### Issue 1: `webkitendfullscreen` event may not fire reliably in Natively's WKWebView

In iOS native fullscreen mode, the video player takes over the entire screen outside the WebView context. When exiting, iOS may not properly fire the `webkitendfullscreen` event back to JavaScript, meaning our restoration code never runs.

### Issue 2: The problem is likely a `visualViewport.offsetTop` desync

When iOS exits native fullscreen video:
1. The visual viewport can become offset from the layout viewport
2. `visualViewport.offsetTop` may have a non-zero value
3. This creates a gap between where the browser thinks the top is vs. where content renders

### Issue 3: Inset refresh alone doesn't fix viewport offset

Refreshing the Natively safe-area insets is necessary but not sufficient. The fundamental issue is that iOS has internally shifted where it renders the page content.

---

## Solution Strategy

A multi-layered approach targeting all possible failure points:

### Layer 1: Use `visualViewport` API directly

Monitor `window.visualViewport` for `resize` events after fullscreen exit. If `offsetTop > 0`, force a viewport correction.

### Layer 2: Add fallback with multiple event sources

Listen to ALL possible events that could indicate fullscreen exit:
- `webkitendfullscreen` (iOS video element event)
- `fullscreenchange` (standard API)
- `visibilitychange` (page comes back to foreground)
- `visualViewport resize` (viewport dimensions change)

### Layer 3: Aggressive DOM-level reset

When fullscreen exit is detected:
1. Force a reflow by toggling `document.documentElement.style.overflow`
2. Reset `scrollTop` on html, body, and layout containers
3. If `visualViewport.offsetTop > 0`, apply a counter-transform or force scroll

### Layer 4: Add a "viewport sentinel" element

Create an invisible `position: fixed; top: 0` element and check if its `getBoundingClientRect().top !== 0` after fullscreen exit. If it's non-zero, the viewport is misaligned.

---

## Implementation Plan

### File 1: Rewrite `src/hooks/useFullscreenScrollFix.ts`

```text
Changes:
1. Add visualViewport monitoring for offsetTop anomalies
2. Add a multi-event fallback system (not just webkit events)
3. Implement an aggressive DOM reset function that:
   - Forces reflow via overflow toggle
   - Resets html.scrollTop, body.scrollTop, window.scrollTo(0,0)
   - Applies negative translate if visualViewport.offsetTop > 0
4. Add a sentinel check using a fixed element
5. Keep debug logging for Natively environment
```

Key new logic:
```typescript
// After fullscreen exit detected (from any source):
const resetViewport = () => {
  // Force reflow
  const html = document.documentElement;
  const originalOverflow = html.style.overflow;
  html.style.overflow = 'hidden';
  void html.offsetHeight; // Force reflow
  html.style.overflow = originalOverflow;

  // Reset all scroll positions
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // Check visualViewport offset
  if (window.visualViewport && window.visualViewport.offsetTop > 0) {
    // iOS has an internal offset - compensate
    window.scrollTo(0, -window.visualViewport.offsetTop);
  }

  // Dispatch inset refresh
  window.dispatchEvent(new Event('natively:refresh-insets'));
};

// Add visualViewport listener
window.visualViewport?.addEventListener('resize', () => {
  if (wasInFullscreen && window.visualViewport.offsetTop > 0) {
    resetViewport();
  }
});
```

### File 2: Update `src/components/NativelySafeAreaProvider.tsx`

```text
Changes:
1. Add listener for visualViewport resize events
2. When visualViewport.offsetTop > 0, trigger additional reset logic
3. Keep existing inset refresh on natively:refresh-insets event
```

### File 3: Create global fullscreen exit handler in `src/main.tsx`

Since the fullscreen issue happens at the native iOS layer (not React component layer), add a global handler that monitors for viewport anomalies:

```typescript
// In main.tsx, before render
if (typeof window !== 'undefined' && 'visualViewport' in window) {
  let lastOffsetTop = 0;
  window.visualViewport?.addEventListener('resize', () => {
    const vv = window.visualViewport!;
    if (vv.offsetTop > 10 && lastOffsetTop <= 10) {
      // Viewport suddenly has offset - likely fullscreen exit
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        window.dispatchEvent(new Event('natively:refresh-insets'));
      }, 100);
    }
    lastOffsetTop = vv.offsetTop;
  });
}
```

### File 4: Add CSS safety net in `src/index.css`

Add CSS that ensures the root element doesn't get offset:

```css
/* Natively viewport fix */
.is-natively-app {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.is-natively-app #root {
  position: relative;
  min-height: 100%;
}
```

This makes the app use a fixed-position container that iOS cannot offset.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useFullscreenScrollFix.ts` | Rewrite | Add visualViewport monitoring, multi-event fallback, aggressive DOM reset |
| `src/components/NativelySafeAreaProvider.tsx` | Update | Add visualViewport listener for anomaly detection |
| `src/main.tsx` | Update | Add global fullscreen exit monitor |
| `src/index.css` | Update | Add fixed-position layout for Natively to prevent iOS viewport shifting |

---

## Technical Details

### Why fixed positioning helps

iOS WKWebView can internally shift the layout viewport when transitioning in/out of fullscreen. By using `position: fixed` for the root container:
- The container is removed from normal document flow
- iOS cannot "push" it down
- Content stays anchored to the visual viewport

### Why visualViewport.offsetTop is the key indicator

When iOS fullscreen exits improperly:
- `window.scrollY` might be 0
- `document.documentElement.scrollTop` might be 0
- But `visualViewport.offsetTop` will be non-zero (e.g., 47px for notch area)

This means iOS has internally offset where it draws the page, even though scroll positions look normal.

### Multi-pass restoration timing

Due to WKWebView's async nature:
- Immediate reset (within event handler)
- 50ms delay (allow iOS to settle)
- 200ms delay (catch late layout changes)
- 500ms delay (final safety check)

---

## Testing Plan

After implementation:
1. Open Recordings → select a video → enter fullscreen → exit fullscreen
2. Verify header stays at top with no gap
3. Test multiple entries/exits in succession
4. Test with device rotation during fullscreen
5. Test in PWA to ensure no regressions

