
# Development Standards

## Toast/Notification System: Sonner

**Standard**: All toast notifications use Sonner exclusively.

### Usage Pattern
```typescript
import { toast } from 'sonner';

// Success
toast.success('Action completed', { description: 'Optional details' });

// Error
toast.error('Something went wrong', { description: error.message });

// Info
toast.info('Information message');

// Warning
toast.warning('Warning message');
```

### Key Rules
1. **Import**: Always use `import { toast } from 'sonner'`
2. **No Radix UI toast**: The old `useToast` hook and Radix UI toast components have been removed
3. **Method syntax**: Use `toast.success()`, `toast.error()`, etc. instead of object syntax
4. **Descriptions**: Pass as second argument: `{ description: 'text' }`

### Toaster Component
The `<Toaster />` from `@/components/ui/sonner` is already configured in `App.tsx`.
