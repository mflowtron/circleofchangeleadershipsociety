

# Make Toast Notifications Respect Mobile Safe Area

## Problem

Toast notifications on mobile devices are appearing behind the OS status bar/notch area. They need to respect the safe area inset so they remain visible and don't overlap with system UI elements.

## Solution

Sonner provides a `mobileOffset` prop specifically for mobile devices. We'll use this prop with `env(safe-area-inset-top)` to push toasts below the status bar on devices with notches or Dynamic Islands.

Since `env(safe-area-inset-top)` returns `0px` on devices without safe areas (and on desktop), this is safe to apply universally - it will only add offset when needed.

---

## File to Modify

### `src/components/ui/sonner.tsx`

Add the `mobileOffset` prop to the Toaster component to respect the safe area inset at the top:

```tsx
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      mobileOffset={{ top: 'env(safe-area-inset-top)' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
```

---

## Technical Details

- **`mobileOffset`**: Sonner's dedicated prop for mobile-specific toast positioning
- **`env(safe-area-inset-top)`**: CSS environment variable that returns the safe area inset for the top edge (notch, Dynamic Island, status bar). Returns `0px` on devices/browsers without safe areas.
- The `viewport-fit=cover` meta tag in `index.html` is already configured, which enables safe area CSS variables to work properly.

---

## Expected Result

- Toast notifications will appear below the status bar/notch on iOS devices
- No visual change on desktop or Android devices without notches
- Works in both portrait and landscape orientations

