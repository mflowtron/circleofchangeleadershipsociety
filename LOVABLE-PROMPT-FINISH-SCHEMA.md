# Lovable Follow-Up Prompt: Finish Schema Simplification

> Paste everything below the divider into Lovable.

---

## PROMPT FOR LOVABLE

The database schema simplification migration is nearly complete. The build passes and there are no TypeScript errors. After a thorough audit, I found one missing feature and a few small cleanup items. Please complete these:

---

### 1. Add localStorage-based dismissed announcements

The old `dismissed_announcements` table was dropped, but the client-side replacement was never implemented. Update `src/hooks/useAnnouncements.ts` to:

- Add a `dismissAnnouncement(id: string)` function that saves dismissed IDs to `localStorage` under the key `dismissed_announcements` (as a JSON string array)
- On load, read `dismissed_announcements` from `localStorage` and filter them out of the active `announcements` list returned by the hook
- Return `dismissAnnouncement` from the hook so components can call it

Also update the component that displays announcements to include a dismiss/close button that calls `dismissAnnouncement(id)`.

The admin view (`allAnnouncements`) should NOT be filtered — only the active user-facing `announcements` list should respect dismissed state.

---

### 2. Delete the `send-customer-message` edge function directory

The `supabase/functions/send-customer-message/` directory still exists on disk even though it should have been deleted as part of Change 11. Please delete the entire `supabase/functions/send-customer-message/` directory.

---

### 3. Remove stale comment in usePosts.ts

In `src/hooks/usePosts.ts` line 62, there's a comment that says `// Build the base query - using new 'posts' table name (not lms_posts)`. Remove this comment — the migration is done and referencing the old table name in comments adds noise. The code should just reference `posts` without explanation.

---

### 4. Remove stale comment in useAttendees.ts

In `src/hooks/useAttendees.ts` line 4, there's a comment that says `// Updated interface to match new schema - no more order_id, ticket_type_id, is_purchaser columns`. Remove this comment — it describes a migration that is now complete and adds noise.

---

That's it. The schema simplification is otherwise complete:
- All 22 tables are correctly defined
- All 13 dropped tables are gone
- All 3 enums are correct (user_role, order_status, moderation_status)
- All edge functions reference the correct new table/column names
- All hooks and components use the new schema
- The TypeScript types match the database
- The app builds without errors
