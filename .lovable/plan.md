
# Plan: Light Mode Sidebar

## Overview

Currently, the LMS Sidebar uses a permanently dark theme with `bg-sidebar`, `--gradient-dark`, and dark-specific CSS variables. The Events Dashboard Sidebar follows the main theme (using `bg-card`). 

This plan creates a **light mode version** of the sidebars that follows the application's theme setting - appearing light when in light mode and dark when in dark mode.

---

## Current State

### LMS Sidebar (`Sidebar.tsx`)
- Uses `bg-sidebar text-sidebar-foreground` with inline `backgroundImage: "var(--gradient-dark)"`
- Always appears dark regardless of theme
- Uses `logoDark` (light text logo for dark backgrounds)

### Events Dashboard Sidebar (`EventsDashboardSidebar.tsx`)
- Uses `bg-card border-r` which follows the theme
- Already adapts to light/dark mode

### CSS Variables (`index.css`)
- `--sidebar-*` variables are defined for dark colors in both `:root` and `.dark`
- Both modes have the same dark sidebar colors

---

## Implementation Steps

### Step 1: Update CSS Variables for Light Mode Sidebar

Modify `index.css` to provide light-themed sidebar variables for `:root` (light mode):

```css
:root {
  /* Light mode sidebar - warm cream with subtle gold accents */
  --sidebar-background: 40 30% 97%;
  --sidebar-foreground: 30 15% 12%;
  --sidebar-primary: 42 75% 50%;
  --sidebar-primary-foreground: 40 30% 97%;
  --sidebar-accent: 40 25% 92%;
  --sidebar-accent-foreground: 30 15% 12%;
  --sidebar-border: 40 20% 88%;
  --sidebar-ring: 42 75% 50%;
  --sidebar: 40 30% 97%;
  
  /* Add light gradient for sidebar */
  --gradient-sidebar: linear-gradient(180deg, hsl(40 30% 97%) 0%, hsl(40 25% 94%) 100%);
}

.dark {
  /* Keep existing dark sidebar colors */
  --gradient-sidebar: linear-gradient(180deg, hsl(30 12% 8%) 0%, hsl(30 15% 5%) 100%);
}
```

### Step 2: Update LMS Sidebar Component

Modify `Sidebar.tsx` to use theme-aware styling:

**Changes:**
1. Replace `--gradient-dark` with `--gradient-sidebar` (theme-aware)
2. Import both logo versions and conditionally render based on theme
3. Update border and text colors to use sidebar tokens

```tsx
// Add theme detection
import { useTheme } from 'next-themes';
import logoDark from '@/assets/coclc-logo-dark.png';
import logoLight from '@/assets/coclc-logo-light.png';

export default function Sidebar() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // Use appropriate logo based on theme
  const logo = isDark ? logoDark : logoLight;
  
  return (
    <aside
      className="... bg-sidebar text-sidebar-foreground border-r border-sidebar-border ..."
      style={{ backgroundImage: "var(--gradient-sidebar)" }}
    >
      <img src={logo} alt="Circle of Change" className="h-10" />
      {/* ... rest of component */}
    </aside>
  );
}
```

### Step 3: Update Events Dashboard Sidebar

Modify `EventsDashboardSidebar.tsx` to use the same sidebar tokens for consistency:

```tsx
<aside
  className="... bg-sidebar text-sidebar-foreground border-r border-sidebar-border ..."
  style={{ backgroundImage: "var(--gradient-sidebar)" }}
>
```

Update all internal elements to use sidebar-specific color tokens.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/index.css` | Modify | Add light-themed sidebar CSS variables and `--gradient-sidebar` |
| `src/components/layout/Sidebar.tsx` | Modify | Use theme-aware gradient and logo switching |
| `src/components/events/EventsDashboardSidebar.tsx` | Modify | Use sidebar tokens for consistency |

---

## Visual Result

### Light Mode Sidebar
- Warm cream background with subtle gradient
- Dark charcoal text for readability
- Gold accent color for active states
- Light-text logo (`coclc-logo-light.png`)

### Dark Mode Sidebar
- Deep charcoal background (unchanged)
- Light cream text
- Gold accent color for active states
- Dark-text logo (`coclc-logo-dark.png`)

---

## Technical Notes

- Uses `next-themes` hook (`useTheme`) to detect current theme
- `resolvedTheme` handles system preference detection
- CSS variables automatically switch based on `.dark` class
- Both sidebars will now follow the application's theme setting
- The premium aesthetic is maintained in both modes with appropriate contrast
