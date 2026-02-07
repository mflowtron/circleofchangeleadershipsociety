

# Grant Full Admin Permissions to mflotron91@gmail.com

## Current State

The user `mflotron91@gmail.com` currently has only one role:
- `lms_admin` - LMS Admin access

## Required Roles for Full Admin Access

Based on the multi-role architecture, the following admin roles need to be added:

| Area | Role | Status |
|------|------|--------|
| LMS | `lms_admin` | Already assigned |
| Event Management | `em_admin` | Needs to be added |
| Attendee App | `attendee_advisor` | Needs to be added (highest attendee role) |

## Database Changes

Insert two new role records into the `user_roles` table for user_id `6d8fab70-f16c-4092-917c-0da9af673f9a`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('6d8fab70-f16c-4092-917c-0da9af673f9a', 'em_admin'),
  ('6d8fab70-f16c-4092-917c-0da9af673f9a', 'attendee_advisor');
```

## Result

After this change, the user will have full admin access to:
- **LMS** - Full admin capabilities (manage users, chapters, announcements, recordings, moderation)
- **Event Management** - Full admin capabilities (create/manage events, view all orders, manage attendees)
- **Attendee App** - Advisor-level access (the highest role available in the attendee domain)

## No Code Changes Required

This is a data-only change. No code modifications are needed - the existing role system will automatically recognize the new roles when the user logs in.

