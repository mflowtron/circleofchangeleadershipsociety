
# Phase 6 Continuation: Update Remaining Edge Functions to JWT Authentication

## Overview

Update all remaining edge functions from custom session token authentication to Supabase JWT authentication. The `get-orders-by-email` function has already been updated and serves as the template pattern.

---

## Authentication Pattern to Implement

Each function will follow this standardized pattern:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// 1. Extract and verify JWT from Authorization header
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// 2. Create client with user's auth context for getClaims
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);

// 3. Verify JWT and extract email
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

if (claimsError || !claimsData?.claims?.email) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const email = (claimsData.claims.email as string).toLowerCase().trim();

// 4. Create admin client for database operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

---

## Edge Functions to Update (18 total)

### Group 1: Order Portal Functions (3 functions)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `update-attendee-public` | Update attendee name/email | Remove `email`/`session_token` params, verify via JWT |
| `mark-message-read` | Mark order message as read | Remove `email`/`session_token` params, verify via JWT |
| `send-customer-message` | Send message from customer | Remove `email`/`session_token` params, use JWT email |

### Group 2: Attendee Profile Functions (2 functions)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `get-attendee-profile` | Get attendee profile data | Remove `email`/`session_token` params |
| `update-attendee-profile` | Update attendee profile | Remove `email`/`session_token` params |

### Group 3: Bookmark Functions (2 functions)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `get-attendee-bookmarks` | Get bookmarks for attendee | Remove `email`/`session_token` params |
| `toggle-attendee-bookmark` | Add/remove bookmark | Remove `email`/`session_token` params |

### Group 4: Conversation Functions (7 functions)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `get-attendee-conversations` | List user's conversations | Remove `email`/`session_token` params |
| `get-conversation-messages` | Get messages in conversation | Remove `email`/`session_token` params |
| `create-dm-conversation` | Create direct message | Remove `email`/`session_token` params |
| `create-group-conversation` | Create group chat | Remove `email`/`session_token` params |
| `join-event-chat` | Join event-wide chat | Remove `email`/`session_token` params |
| `join-session-chat` | Join session chat | Remove `email`/`session_token` params |
| `upload-chat-attachment` | Upload file attachment | Remove `email`/`session_token` params |

### Group 5: Networking Functions (1 function)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `get-networkable-attendees` | List attendees open to networking | Remove `email`/`session_token` params |

### Group 6: Message Reaction Functions (2 functions)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `toggle-message-reaction` | Add/remove emoji reaction | Remove `email`/`session_token` params |
| `get-message-reactors` | Get who reacted to message | Remove `email`/`session_token` params |

### Group 7: Send Message Function (1 function)

| Function | Purpose | Key Changes |
|----------|---------|-------------|
| `send-attendee-message` | Send chat message | Remove `email`/`session_token` params |

---

## Edge Functions to Delete (2 total)

These are now obsolete since we're using Supabase magic link:

| Function | Reason for Deletion |
|----------|---------------------|
| `send-order-access-code` | OTP code generation replaced by Supabase magic link |
| `verify-order-access-code` | OTP verification replaced by Supabase session management |

---

## Frontend Updates

The frontend hooks already use `supabase.functions.invoke()`, which automatically includes the Authorization header with the JWT token. We need to:

1. **Remove unused parameters** from function calls:
   - Remove `email` parameter (extracted from JWT)
   - Remove `session_token` parameter (JWT replaces this)

2. **Files to update**:
   - `src/contexts/AttendeeContext.tsx` - Already partially updated, verify function calls
   - `src/hooks/useMessages.ts` - Already partially updated
   - `src/hooks/useNetworking.ts` - Already partially updated
   - `src/hooks/useOrderPortal.ts` - Already updated
   - `src/hooks/useOrderMessages.ts` - May need updates for send/mark-read

---

## Detailed Changes per Function

### Example: `toggle-attendee-bookmark`

**Before (lines 21-52):**
```typescript
const { email, session_token, attendee_id, agenda_item_id } = await req.json();

if (!email || !session_token || !attendee_id || !agenda_item_id) {
  // validation...
}

// Validate session token via order_access_codes table
const { data: session, error: sessionError } = await supabaseAdmin
  .from('order_access_codes')
  .select('*')
  .ilike('email', normalizedEmail)
  .eq('code', session_token)
  .gt('expires_at', new Date().toISOString())
  .maybeSingle();

if (sessionError || !session) {
  return new Response(
    JSON.stringify({ error: 'Invalid or expired session' }),
    { status: 401, ... }
  );
}
```

**After:**
```typescript
// Extract and verify JWT
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, ... }
  );
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);

const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

if (claimsError || !claimsData?.claims?.email) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, ... }
  );
}

const normalizedEmail = (claimsData.claims.email as string).toLowerCase().trim();

// Now get attendee_id and agenda_item_id from request body
const { attendee_id, agenda_item_id } = await req.json();

if (!attendee_id || !agenda_item_id) {
  // validation...
}
```

---

## Database Cleanup (Deferred)

After confirming all functions work correctly:

1. **Delete the `order_access_codes` table** - No longer needed
2. **Migration SQL**:
```sql
DROP TABLE IF EXISTS order_access_codes;
```

This should be done in a separate step after verifying the migration is complete.

---

## Implementation Order

1. Update edge functions in groups (parallel batch updates)
2. Deploy and test each group
3. Delete obsolete edge functions
4. Verify all attendee app flows work
5. Clean up `order_access_codes` table (separate migration)

---

## Summary

| Category | Count |
|----------|-------|
| Edge functions to update | 18 |
| Edge functions to delete | 2 |
| Total edge functions affected | 20 |
| Frontend files to verify | 4-5 |

