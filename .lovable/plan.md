
# Clean Up Obsolete OTP Edge Function Configuration

## Overview

The OTP edge function code files were deleted in the previous step. Now we need to:
1. Remove the configuration entries from `supabase/config.toml`
2. Delete the deployed functions from Supabase

---

## Changes Required

### 1. Update `supabase/config.toml`

Remove these two configuration blocks:

```toml
# DELETE these lines:
[functions.send-order-access-code]
verify_jwt = false

[functions.verify-order-access-code]
verify_jwt = false
```

### 2. Delete Deployed Functions

Use the Supabase delete_edge_functions tool to remove the deployed functions:
- `send-order-access-code`
- `verify-order-access-code`

---

## Summary

| Action | Target |
|--------|--------|
| Remove config entry | `send-order-access-code` |
| Remove config entry | `verify-order-access-code` |
| Delete deployed function | `send-order-access-code` |
| Delete deployed function | `verify-order-access-code` |

This completes the Phase 6 cleanup of the obsolete OTP authentication system.
