

# Fix Layout Shift After Fullscreen Exit - Approach 2 (Visibility-Based Detection)

## Problem Summary

When exiting fullscreen video in the Recordings player within the Natively iOS app, the entire page layout (including header) shifts down significantly and stays stuck until the app is force-closed. Previous attempts using:
- `fullscreenchange` / `webkitfullscreenchange` events
- `webkitendfullscreen` on video element
- `visualViewport.offsetTop` monitoring
- CSS compensation with `translateY`

...have all failed to resolve the issue. This indicates that:
1. The native fullscreen transition bypasses web fullscreen events entirely
2. The WKWebView is not reliably firing expected events after native video fullscreen exits

---

## New Strategy

Since native fullscreen transitions happen outside the web context, we need to:

1. **Detect fullscreen exit indirectly** via the Page Visibility API - when native video takes over, the WebView page becomes "hidden", and when it returns, `visibilitychange` fires with `visible` state

2. **Use the Natively loading screen** to mask the viewport reset so users don't see any visual glitch during the fix

3. **Force aggressive viewport recalculation** using viewport meta tag manipulation, which is a known WebView trick to force the rendering engine to re-evaluate layout dimensions

---

## Implementation Plan

### Step 1: Create New Hook File

**File:** `src/hooks/useFullscreenLayoutFix.ts` (new file, replacing `useFullscreenScrollFix.ts`)

The hook will:

1. **Only run in Natively app** - exit early if `browserInfo.isNativeApp` is false

2. **Primary detection: Page Visibility API**
   - Track when page goes hidden (fullscreen started)
   - When page becomes visible again AND was previously hidden, trigger the reset
   - This works because native video fullscreen causes the WebView to become "hidden"

3. **Secondary detection: Resize events**
   - WebView often fires a resize when returning from native fullscreen
   - Use 300ms debounce to prevent triggering on normal layout changes

4. **Tertiary fallback: Standard fullscreen events**
   - Keep `fullscreenchange` and `webkitfullscreenchange` as fallbacks

5. **Reset viewport function**
   - Show Natively loading screen briefly (`showLoadingScreen(true)`) to mask the reset
   - Force scroll to top, then restore original position
   - Toggle a CSS class that forces GPU layer recalculation
   - Manipulate viewport meta tag to force layout re-evaluation
   - Toggle html element height/overflow to force reflow
   - Refresh safe area insets
   - Re-apply theme sync for status bar

```typescript
// Key structure of the reset function:
function resetViewport() {
  const scrollY = window.scrollY;
  
  // 1. Force scroll reset
  window.scrollTo(0, 0);
  
  // 2. Toggle CSS class for GPU layer recalculation
  document.body.classList.add('natively-viewport-reset');
  
  // 3. Viewport meta tag manipulation trick
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const originalContent = viewport.getAttribute('content') || '';
    viewport.setAttribute('content', originalContent + ', maximum-scale=1');
    requestAnimationFrame(() => {
      viewport.setAttribute('content', originalContent);
    });
  }
  
  // 4. Force reflow via height/overflow toggle
  const html = document.documentElement;
  html.style.height = 'auto';
  html.style.overflow = 'hidden';
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.style.height = '';
      html.style.overflow = '';
      document.body.classList.remove('natively-viewport-reset');
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
      
      // Refresh insets and dispatch events
      window.dispatchEvent(new Event('natively:refresh-insets'));
    });
  });
}
```

---

### Step 2: Add CSS for Reset Class

**File:** `src/index.css`

Add a utility class that forces GPU layer recalculation:

```css
/* Viewport reset helper for Natively fullscreen fix */
.natively-viewport-reset {
  transform: translateZ(0);
  will-change: transform;
}
```

---

### Step 3: Wire Up the Hook at App Root

**File:** `src/App.tsx`

Add the hook call in the `AppContent` component (which already calls `useNativelyThemeSync`):

```typescript
import { useFullscreenLayoutFix } from './hooks/useFullscreenLayoutFix';

function AppContent() {
  useNativelyThemeSync();
  useFullscreenLayoutFix(); // Add this
  // ... rest of component
}
```

---

### Step 4: Update MuxPlayerWithFix Component

**File:** `src/components/video/MuxPlayerWithFix.tsx`

Remove the old `useFullscreenScrollFix` hook since the new approach is global and doesn't need a player reference:

```typescript
// Remove this import and usage:
// import { useFullscreenScrollFix } from '@/hooks/useFullscreenScrollFix';
// useFullscreenScrollFix(internalRef);
```

---

### Step 5: Clean Up Old Files

**File:** `src/hooks/useFullscreenScrollFix.ts`

Either delete this file or keep it as deprecated. The new `useFullscreenLayoutFix.ts` will replace it.

---

### Step 6: Simplify NativelySafeAreaProvider

**File:** `src/components/NativelySafeAreaProvider.tsx`

Keep the inset management and viewport compensation logic, but remove the settle window complexity if the new approach works. The provider should still:
- Listen for `natively:refresh-insets` events
- Set CSS custom properties for safe areas
- Maintain the sentinel element for debugging

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useFullscreenLayoutFix.ts` | Create | New hook using Visibility API + resize detection + loading screen masking |
| `src/hooks/useFullscreenScrollFix.ts` | Delete | Old approach that didn't work |
| `src/index.css` | Update | Add `.natively-viewport-reset` CSS class |
| `src/App.tsx` | Update | Wire up `useFullscreenLayoutFix` in AppContent |
| `src/components/video/MuxPlayerWithFix.tsx` | Update | Remove old hook usage |

---

## Technical Details

### Why Visibility API Works

When the native video player takes over fullscreen:
1. iOS creates a native fullscreen video layer outside the WebView
2. The WebView page effectively becomes "hidden"
3. When the user exits fullscreen, the WebView becomes "visible" again
4. The `visibilitychange` event fires reliably, unlike webkit fullscreen events

### Why Viewport Meta Manipulation Works

WKWebView caches the viewport dimensions. By temporarily changing the viewport meta content and restoring it in the next frame:
1. WebView is forced to re-parse the viewport rules
2. This triggers a complete layout recalculation
3. The stuck offset gets cleared as a side effect

### Loading Screen Masking

Using `natively.showLoadingScreen(true)` with `autoHide=true`:
- Shows a native loading overlay
- Automatically hides once the page stabilizes
- Masks any visual glitches during the reset

---

## Testing Plan

1. **In Natively iOS app:**
   - Open Recordings player
   - Play a video and enter fullscreen
   - Exit fullscreen
   - **Expected:** Header stays at top with no gap

2. **Repeat multiple times:**
   - Enter/exit fullscreen 3-5 times rapidly
   - **Expected:** No accumulating offset

3. **PWA sanity check:**
   - Test the same flow in PWA mode
   - **Expected:** No changes, no errors (hook exits early)

4. **Normal browsing:**
   - Navigate around the app
   - **Expected:** Resize debounce doesn't trigger false positives

