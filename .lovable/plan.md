
# Logo Update Plan - Three Variations with Theme Support

## Overview
Update the app to use the three logo variations optimally across all components, ensuring proper contrast in both light and dark modes.

## Logo Variations Analysis

| Logo | File | Best Use Case |
|------|------|---------------|
| **Emblem Only** | `coclc-logo-emblem-only.png` | Small spaces (favicon area in headers), tight layouts where text won't fit |
| **Full Logo (Dark Text)** | `coclc-logo-side-alpha-lightmode.png` | Light mode backgrounds (cream/white cards, light sidebar areas) |
| **Full Logo (Light Text)** | `coclc-logo-side-alpha-darkmode.png` | Dark mode backgrounds (dark sidebar, dark cards) |

## Design Strategy

### Where to Use Each Logo

**Emblem Only:**
- Header (desktop) - small icon next to "Circle of Change" text
- PWA Install Banner - app icon display
- Any small icon displays

**Full Logo with Dark Text (Light Mode):**
- Auth page - center card (light background)
- Pending Approval page - center card (light background)  
- Events Layout header - light mode
- Dashboard Selector - light mode

**Full Logo with Light Text (Dark Mode):**
- Sidebar - always dark themed
- Any dark backgrounds where full branding is needed

**Theme-Aware Locations (switch based on theme):**
- Auth page, Pending Approval page, Events Layout header
- These need to detect theme and show appropriate version

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/assets/` | Copy files | Add all 3 logo variations |
| `src/components/layout/Sidebar.tsx` | Modify | Use dark mode full logo (sidebar is always dark) |
| `src/components/layout/Header.tsx` | Modify | Use emblem only for small icon |
| `src/pages/Auth.tsx` | Modify | Theme-aware full logo |
| `src/pages/PendingApproval.tsx` | Modify | Theme-aware full logo |
| `src/pages/DashboardSelector.tsx` | Modify | Add logo with theme awareness |
| `src/layouts/EventsLayout.tsx` | Modify | Theme-aware full logo instead of calendar icon |
| `src/components/pwa/InstallBanner.tsx` | Modify | Use emblem-only logo |

---

## Technical Implementation

### 1. Copy Logo Assets to Project
Copy all three uploaded logos to `src/assets/`:
- `coclc-logo-emblem-only.png` → `src/assets/coclc-logo-emblem.png`
- `coclc-logo-side-alpha-lightmode.png` → `src/assets/coclc-logo-light.png`
- `coclc-logo-side-alpha-darkmode.png` → `src/assets/coclc-logo-dark.png`

### 2. Sidebar (Always Dark Background)
The sidebar uses a dark gradient background, so it should always use the **light text** version:
```tsx
import logoDark from '@/assets/coclc-logo-dark.png';
// Use logoDark in the header section
```

### 3. Header (Small Emblem)
The header shows a small logo in desktop view. Use the emblem-only version:
```tsx
import logoEmblem from '@/assets/coclc-logo-emblem.png';
// In the small icon container
```

### 4. Theme-Aware Components (Auth, PendingApproval, EventsLayout, DashboardSelector)
These components sit on backgrounds that change with theme. Implement theme-aware logo switching:
```tsx
import logoLight from '@/assets/coclc-logo-light.png';
import logoDark from '@/assets/coclc-logo-dark.png';
import { useTheme } from 'next-themes';

// Inside component:
const { resolvedTheme } = useTheme();
const logo = resolvedTheme === 'dark' ? logoDark : logoLight;
```

### 5. PWA Install Banner
Use the emblem-only logo for the app icon in the install prompt:
```tsx
import logoEmblem from '@/assets/coclc-logo-emblem.png';
// Replace /favicon.png reference
```

---

## Visual Placement Details

### Sidebar
- Location: Top header area
- Logo: Full logo with light text (`coclc-logo-dark.png`)
- Size: `h-10` (40px height)
- Always displays full branding since sidebar is prominent

### Header (Desktop)
- Location: Left side, next to org name text
- Logo: Emblem only (`coclc-logo-emblem.png`) 
- Size: `h-6 w-6` (24px)
- Small emblem accompanies the text "Circle of Change"

### Auth Page
- Location: Center of card, above "Welcome Back"
- Logo: Theme-aware full logo
- Size: `h-14` (56px height)
- Background container with padding

### Pending Approval Page
- Location: Center of card, above clock icon
- Logo: Theme-aware full logo
- Size: `h-16` (64px height)

### Dashboard Selector
- Location: Top center, above "Welcome Back" heading
- Logo: Theme-aware full logo
- Size: `h-12` (48px height)
- New addition - currently has no logo

### Events Layout Header
- Location: Left side in header nav
- Logo: Theme-aware full logo (replaces Calendar icon)
- Size: `h-8` (32px height)
- Accompanies "Circle of Change Events" text

### PWA Install Banner
- Location: Small icon in the banner
- Logo: Emblem only
- Size: `w-8 h-8` (32px)
