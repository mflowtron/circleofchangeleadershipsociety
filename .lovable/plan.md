

# Add System Option to Theme Toggle

## Overview

Replace the current binary Switch toggle with a three-option segmented control that allows users to choose between Light, System (auto), or Dark themes. The "System" option follows the device's automatic light/dark preference.

---

## Visual Design

```text
Current (Switch):
┌────────────────────────────────────────┐
│  Dark Mode                      [OFF]  │
│  Using light color scheme              │
└────────────────────────────────────────┘

New (Segmented Control):
┌────────────────────────────────────────┐
│  Theme                                 │
│  Customize how the app looks           │
│                                        │
│  ┌─────────┬──────────┬─────────┐     │
│  │   ☀️    │    💻    │   🌙   │      │
│  │  Light  │  System  │  Dark   │      │
│  └─────────┴──────────┴─────────┘     │
│                                        │
│  Currently using: Dark (from system)   │
└────────────────────────────────────────┘
```

---

## Implementation

### File: `src/pages/attendee/AttendeeProfile.tsx`

**1. Update imports:**
- Add `Sun, Monitor` icons from lucide-react
- Add `ToggleGroup, ToggleGroupItem` from `@/components/ui/toggle-group`

**2. Update useTheme hook:**
Change from `resolvedTheme` only to include `theme` as well:
```tsx
const { theme, resolvedTheme, setTheme } = useTheme();
```
- `theme` = the user's selection ('light', 'dark', or 'system')
- `resolvedTheme` = the actual applied theme ('light' or 'dark')

**3. Remove the `toggleTheme` function** (no longer needed)

**4. Replace the Appearance Card content:**

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
  <CardContent className="space-y-3">
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => value && setTheme(value)}
      className="w-full justify-between bg-muted rounded-lg p-1"
    >
      <ToggleGroupItem 
        value="light" 
        className="flex-1 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        <Sun className="h-4 w-4" />
        <span className="text-xs">Light</span>
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="system" 
        className="flex-1 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        <Monitor className="h-4 w-4" />
        <span className="text-xs">System</span>
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="dark" 
        className="flex-1 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        <Moon className="h-4 w-4" />
        <span className="text-xs">Dark</span>
      </ToggleGroupItem>
    </ToggleGroup>
    
    <p className="text-xs text-muted-foreground text-center">
      {theme === 'system' 
        ? `Following system preference (${resolvedTheme})`
        : `Using ${resolvedTheme} color scheme`
      }
    </p>
  </CardContent>
</Card>
```

---

## Technical Notes

| Value | Description |
|-------|-------------|
| `theme` | User's explicit choice: 'light', 'dark', or 'system' |
| `resolvedTheme` | Actual applied theme after resolving system preference: 'light' or 'dark' |
| `setTheme('system')` | Tells next-themes to follow the OS preference |

### Why ToggleGroup?
- Already available in the project (`@radix-ui/react-toggle-group`)
- Single-select behavior built in
- Accessible keyboard navigation
- Clean visual for 3 mutually exclusive options

### Native Sync
The existing `useNativelyThemeSync` hook uses `resolvedTheme`, so it will continue to work correctly - it syncs the actual applied theme regardless of whether it came from an explicit choice or system preference.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/attendee/AttendeeProfile.tsx` | Replace Switch with ToggleGroup, add Sun/Monitor icons, update theme logic |

