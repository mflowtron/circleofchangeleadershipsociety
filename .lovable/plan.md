

# Test Data Seeding Plan

## Overview
Create 10 test user profiles and 5 posts for each user (50 posts total) with a mix of text-only posts and posts with media attachments.

## Data to Create

### 10 Test Users
Diverse names representing different backgrounds:
1. Sarah Chen - Student
2. Marcus Johnson - Student  
3. Emily Rodriguez - Student
4. David Kim - Student
5. Aisha Patel - Student
6. James Wilson - Student
7. Olivia Thompson - Student
8. Carlos Martinez - Student
9. Mia Williams - Student
10. Alex Nguyen - Student

Each user will have:
- A unique UUID for `user_id`
- A profile entry with full name
- A student role in `user_roles`
- All assigned to the existing chapter (September 2025)

### 50 Posts (5 per user)
Mix of content types per user:
- 3 text-only posts (thoughtful content about leadership, community, learning)
- 1 post with an image (using placeholder image URLs)
- 1 post with a link (educational resources, articles)

Post distribution:
- ~60% global posts (`is_global = true`)
- ~40% chapter-specific posts (for users with chapters assigned)

---

## Technical Implementation

### Database Migration
A single SQL migration will insert all test data:

```sql
-- 1. Generate 10 user UUIDs
-- 2. Insert 10 profiles with names
-- 3. Insert 10 user_roles (all as 'student')
-- 4. Insert 50 posts with varied content

-- Sample post content will include:
-- - Leadership reflections
-- - Community building thoughts
-- - Learning experiences
-- - Event announcements
-- - Resource sharing
```

### Sample Data Content

**Text Posts Examples:**
- "Just finished our chapter meeting and I'm inspired by everyone's commitment to positive change!"
- "Leadership isn't about being in charge - it's about taking care of those in your charge."
- "Grateful for the mentorship I've received. Paying it forward to the next generation."

**Image Posts:**
- Will use Unsplash placeholder URLs (e.g., leadership, teamwork, community themes)

**Link Posts:**
- Educational articles and resources with relevant URLs

---

## Files to Create/Modify

### Database Migration
- Create SQL migration to insert:
  - 10 profiles
  - 10 user_roles  
  - 50 posts with varied timestamps (spread over last 30 days)

### No Code Changes Required
This is purely a data seeding operation via SQL migration.

---

## Important Notes

1. **User IDs**: Generated UUIDs won't have corresponding `auth.users` entries, so these test users cannot log in - they exist only for display purposes in the feed

2. **Media URLs**: Will use publicly accessible placeholder images from Unsplash or similar services

3. **Timestamps**: Posts will have staggered `created_at` dates over the past month for realistic feed appearance

4. **Chapter Assignment**: 5 users will be assigned to the existing "September 2025" chapter, 5 will have no chapter

