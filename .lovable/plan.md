

# Natively Theme Sync Implementation Plan

## Overview

Create a `useNativelyThemeSync` hook that dynamically syncs the native status bar style and app background color with the app's current theme (light/dark). This ensures the status bar icons remain readable against the app's background when running inside the Natively wrapper.

## Current State Analysis

**Theme Management:**
- Uses `next-themes` library with `ThemeProvider` wrapping the app
- Theme is controlled via `useTheme()` hook from `next-themes`
- `resolvedTheme` provides the actual theme ("light" or "dark") after system preference resolution
- Theme toggle component at `src/components/ui/theme-toggle.tsx`

**Background Colors (from CSS):**
- Light mode: `--background: 40 30% 97%` (HSL) = `#F9F8F5` (warm cream)
- Dark mode: `--background: 30 12% 8%` (HSL) = `#161413` (deep charcoal)

**Existing Natively Integration:**
- `NativelySafeAreaProvider` already detects native context
- Uses `NativelyInfo` from `natively` package
- Adds `is-natively-app` class to document
- Accesses SDK via `window.natively`

**Natively SDK Methods:**
```text
window.natively.setAppStatusBarStyleIOS(style)
// style: "DARK" (dark icons for light bg), "LIGHT" (light icons for dark bg), "NONE" (hidden)

window.natively.setAppBackgroundColor(color)
// color: hex string like "#FFFFFF"
```

---

## Implementation Details

### 1. Create useNativelyThemeSync Hook

**File:** `src/hooks/useNativelyThemeSync.ts`

The hook will:
- Use `useTheme()` from `next-themes` to get `resolvedTheme`
- Check if running in Natively using `NativelyInfo`
- Call SDK methods whenever theme changes
- Run on initial mount to set correct status bar immediately

```text
Logic flow:
1. On mount and theme change, check isNativeApp
2. If not native, do nothing
3. If native:
   - Light theme -> setAppStatusBarStyleIOS("DARK") + setAppBackgroundColor("#F9F8F5")
   - Dark theme -> setAppStatusBarStyleIOS("LIGHT") + setAppBackgroundColor("#161413")
```

### 2. Integrate Hook in App

**File:** `src/App.tsx`

Call the hook inside the main App component, after the ThemeProvider so `useTheme()` has access to context:

```text
const App = () => {
  useNativelyThemeSync(); // Add this line
  return (
    <QueryClientProvider client={queryClient}>
      ...
    </QueryClientProvider>
  );
};
```

Note: The hook must be called inside a component that is wrapped by ThemeProvider.

### 3. Alternative Integration Approach

Since the hook needs `useTheme()` context, and `App` component is the one that provides `ThemeProvider`, we have two options:

**Option A:** Create a wrapper component inside ThemeProvider
**Option B:** Integrate into NativelySafeAreaProvider (requires restructuring)

Option A is cleaner - create a small `ThemeSyncWrapper` inside App that calls the hook.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useNativelyThemeSync.ts` | Create | Hook that syncs theme with native status bar |
| `src/App.tsx` | Update | Add wrapper component that calls the hook |

---

## Technical Details

### HSL to Hex Conversion

The CSS variables use HSL format. Converting to hex:

**Light mode background:** `hsl(40, 30%, 97%)`
- Calculation: R=249, G=248, B=245
- Hex: `#F9F8F5`

**Dark mode background:** `hsl(30, 12%, 8%)`
- Calculation: R=22, G=20, B=18
- Hex: `#161412`

### Hook Implementation Pattern

```text
export function useNativelyThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const info = new NativelyInfo();
    if (!info.browserInfo().isNativeApp) return;
    if (!resolvedTheme) return; // Theme not yet resolved

    const natively = (window as any).natively;
    if (!natively) return;

    if (resolvedTheme === 'dark') {
      natively.setAppStatusBarStyleIOS('LIGHT'); // Light icons on dark bg
      natively.setAppBackgroundColor('#161412');
    } else {
      natively.setAppStatusBarStyleIOS('DARK');  // Dark icons on light bg
      natively.setAppBackgroundColor('#F9F8F5');
    }
  }, [resolvedTheme]);
}
```

### App.tsx Integration Pattern

```text
// Create inner component that has access to ThemeProvider context
function AppContent() {
  useNativelyThemeSync();
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <AppContent /> {/* Moved here */}
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
```

---

## Safety Guarantees

1. **Web unaffected**: All SDK calls gated behind `isNativeApp` check
2. **Graceful handling**: Returns early if `resolvedTheme` is undefined (during hydration)
3. **No errors on web**: SDK methods only called when `window.natively` exists
4. **Reactive updates**: Theme changes trigger immediate status bar update via `useEffect` dependency

---

## Testing Considerations

After implementation:
1. Verify web app is unaffected - no console errors, theme toggle works
2. In Natively iOS wrapper: toggle theme and verify status bar icons update
3. In Natively Android wrapper: same verification
4. Test system theme preference changes propagate correctly

