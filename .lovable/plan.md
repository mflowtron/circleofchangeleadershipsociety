

# Fix Stretched Switch Component on iPhone

## Problem

The Switch component (used for "Active" toggles) appears stretched or "smooshed" on iPhone devices. This happens in several places throughout the app where the Switch is used:

- LMS Events form (Active toggle)
- Announcements page (inline toggle)
- Create Announcement form
- Edit Announcement dialog
- Attendee Profile (Open to Networking toggle)
- Event Form (Published toggle)
- Agenda Item Form (toggle)

## Root Cause

On iOS Safari, flex containers can sometimes cause sizing issues with inline-flex elements, even with `shrink-0` applied. The Switch needs explicit fixed dimensions that cannot be overridden by parent containers.

## Solution

Update the Switch component in `src/components/ui/switch.tsx` to have more robust fixed sizing:

### Current Switch styling:
```tsx
// Root element
"peer inline-flex h-6 w-11 shrink-0 cursor-pointer..."

// Thumb element  
"pointer-events-none block h-5 w-5 rounded-full..."
```

### Fixed Switch styling:
```tsx
// Root element - add explicit min/max dimensions and box-sizing
"peer inline-flex shrink-0 cursor-pointer items-center rounded-full 
 border-2 border-transparent transition-colors 
 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input..."
// Plus inline style for fixed dimensions

// Thumb element - add explicit min/max dimensions
"pointer-events-none block rounded-full bg-background shadow-lg ring-0 
 transition-transform data-[state=checked]:translate-x-5 
 data-[state=unchecked]:translate-x-0"
// Plus inline style for fixed dimensions
```

---

## File to Modify

### `src/components/ui/switch.tsx`

Add inline styles to both the Root and Thumb elements to enforce fixed pixel dimensions that cannot be overridden:

**Root element changes:**
- Add `style` prop with explicit `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`
- Remove Tailwind `h-6 w-11` classes (use inline styles instead for stronger enforcement)

**Thumb element changes:**
- Add `style` prop with explicit `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`
- Remove Tailwind `h-5 w-5` classes

This approach uses inline styles which have higher specificity than Tailwind classes and cannot be accidentally overridden by parent flex layouts on iOS.

---

## Updated Code

```tsx
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    style={{
      width: '44px',
      minWidth: '44px',
      maxWidth: '44px',
      height: '24px',
      minHeight: '24px',
      maxHeight: '24px',
      flexShrink: 0,
      flexGrow: 0,
    }}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
      style={{
        width: '20px',
        minWidth: '20px',
        maxWidth: '20px',
        height: '20px',
        minHeight: '20px',
        maxHeight: '20px',
      }}
    />
  </SwitchPrimitives.Root>
));
```

---

## Why This Fix Works

| Aspect | Before | After |
|--------|--------|-------|
| Root dimensions | Tailwind classes `h-6 w-11` (can be affected by flex) | Inline styles with explicit min/max (cannot be overridden) |
| Thumb dimensions | Tailwind classes `h-5 w-5` | Inline styles with explicit min/max |
| Flex behavior | Only `shrink-0` class | Inline `flexShrink: 0` and `flexGrow: 0` for extra safety |

Using inline styles is the most reliable approach for fixed-dimension UI elements that must maintain their size across all browsers and devices, especially in WebViews used by Natively for native mobile apps.

---

## Expected Results

- Switch will maintain its exact 44x24px dimensions on all devices
- Thumb will maintain its exact 20x20px dimensions
- Switch will render correctly on iPhone regardless of parent flex container
- All existing Switch usages throughout the app will automatically benefit from this fix

