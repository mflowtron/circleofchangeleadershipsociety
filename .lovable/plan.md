
# Grant Leanna Admin Access

## Summary

Add a database migration to grant Leanna Mouton (`leanna@coclc.org`) admin access to all modules.

---

## Database Migration

**SQL:**
```sql
-- Grant Leanna Mouton admin access to all modules
INSERT INTO profiles (user_id, full_name, role, module_access, is_approved)
VALUES ('18628588-8533-4472-8ab5-3704f4fc5414', 'Leanna Mouton', 'admin', '{lms,events,attendee}', true)
ON CONFLICT (user_id) DO UPDATE SET 
  role = 'admin', 
  module_access = '{lms,events,attendee}',
  is_approved = true;
```

---

## Result

After this migration runs:
- **User:** Leanna Mouton (leanna@coclc.org)
- **Role:** admin
- **Module Access:** LMS, Events, Attendee
- **Approved:** Yes

She will have full admin access to the LMS dashboard, Events management, and Attendee app.
