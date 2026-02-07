

# Complete Sonner Migration - Final Cleanup

## Summary

Delete the 4 obsolete Radix UI toast files, update one missed file (`CreateGroupDialog.tsx`), and remove the `@radix-ui/react-toast` dependency.

---

## Files to Delete (4 files)

| File | Purpose |
|------|---------|
| `src/components/ui/toast.tsx` | Radix UI toast primitives (111 lines) |
| `src/components/ui/toaster.tsx` | Radix UI toaster component (24 lines) |
| `src/components/ui/use-toast.ts` | Re-export wrapper (3 lines) |
| `src/hooks/use-toast.ts` | Custom toast hook implementation (186 lines) |

---

## File to Update (1 file missed in initial migration)

### `src/components/attendee/CreateGroupDialog.tsx`

**Current code (lines 15, 26, 35-40, 44-49, 67-70, 80-84):**
```typescript
import { useToast } from '@/hooks/use-toast';
// ...
const { toast } = useToast();
// ...
toast({ title: 'Error', description: '...', variant: 'destructive' });
toast({ title: 'Group created!', description: '...' });
```

**Updated code:**
```typescript
import { toast } from 'sonner';
// Remove: const { toast } = useToast();
// ...
toast.error('Error', { description: '...' });
toast.success('Group created!', { description: '...' });
```

---

## Package.json Update

Remove from dependencies (line 45):
```json
"@radix-ui/react-toast": "^1.2.14",
```

---

## Implementation Order

1. Update `CreateGroupDialog.tsx` to use Sonner
2. Delete the 4 obsolete toast files
3. Remove `@radix-ui/react-toast` from `package.json`

---

## Summary

| Action | Count |
|--------|-------|
| Files to delete | 4 |
| Files to update | 1 |
| Dependencies to remove | 1 |

This completes the Sonner toast standardization across the entire application.

