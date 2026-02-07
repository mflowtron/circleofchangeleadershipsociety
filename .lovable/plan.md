

# Add Light/Dark Mode Switch to Attendee App

## Overview

Add a theme toggle switch to the Attendee Profile page, allowing users to switch between light and dark modes. This follows the existing settings pattern already used for the "Open to Networking" toggle.

---

## Design Approach

The switch will be placed in a new "Appearance" card on the AttendeeProfile page, using the same Card + Switch component pattern as the networking toggle. This keeps all user settings in one place.

### Visual Layout
```text
┌────────────────────────────────────────┐
│  🌗 Appearance                         │
│  ───────────────────────────────────── │
│                                        │
│  Dark Mode                      [OFF]  │
│  Switch between light and dark theme   │
│                                        │
└────────────────────────────────────────┘
```

---

## Implementation

### File: `src/pages/attendee/AttendeeProfile.tsx`

1. **Add imports** for theme functionality:
   - `useTheme` from `next-themes`
   - `Moon` icon from `lucide-react`

2. **Add theme state and handler**:
   ```tsx
   const { resolvedTheme, setTheme } = useTheme();
   
   const toggleTheme = (enabled: boolean) => {
     setTheme(enabled ? 'dark' : 'light');
   };
   ```

3. **Add Appearance Card** (after the Networking Toggle Card):
   ```tsx
   {/* Appearance Card */}
   <Card>
     <CardHeader className="pb-3">
       <CardTitle className="flex items-center gap-2 text-base">
         <Moon className="h-5 w-5 text-muted-foreground" />
         Appearance
       </CardTitle>
       <CardDescription>
         Customize how the app looks on your device
       </CardDescription>
     </CardHeader>
     <CardContent>
       <div className="flex items-center justify-between">
         <div>
           <span className="text-sm font-medium">Dark Mode</span>
           <p className="text-xs text-muted-foreground">
             {resolvedTheme === 'dark' 
               ? 'Using dark color scheme' 
               : 'Using light color scheme'
             }
           </p>
         </div>
         <Switch
           checked={resolvedTheme === 'dark'}
           onCheckedChange={toggleTheme}
         />
       </div>
     </CardContent>
   </Card>
   ```

---

## Technical Notes

| Component | Purpose |
|-----------|---------|
| `useTheme` from `next-themes` | Access and control theme state |
| `resolvedTheme` | Returns actual theme ('light' or 'dark'), resolving 'system' preference |
| `useNativelyThemeSync` | Already in place - automatically syncs status bar when theme changes |

### Why This Approach?
- **Consistent pattern**: Matches the existing networking toggle card
- **Settings location**: Profile page is the natural home for user preferences
- **Simple toggle**: Binary light/dark is cleaner for mobile than a 3-option dropdown
- **Native sync**: The existing `useNativelyThemeSync` hook will automatically update the Natively status bar and background color

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/attendee/AttendeeProfile.tsx` | Add `useTheme` import, Moon icon, and new Appearance card with theme switch |

