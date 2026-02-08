
# Create 10 Test Posts in LMS

## Summary

Insert 10 test posts with a variety of content types (text-only, with images, with videos) directly into the database using the available user profiles.

---

## Data Details

### Users to Post From

| User ID | Name | Role |
|---------|------|------|
| `6d8fab70-f16c-4092-917c-0da9af673f9a` | mflotron91@gmail.com | admin |
| `18628588-8533-4472-8ab5-3704f4fc5414` | Leanna Mouton | admin |
| `f3387031-a52b-43f8-bf8c-f58abb023cde` | Circle of Change Lead Conference | member |

### Content Types

| Post # | Type | Content Theme |
|--------|------|---------------|
| 1 | Text only | Welcome message |
| 2 | Text only | Leadership tip |
| 3 | Text + Image | Conference highlight |
| 4 | Text + Image | Team photo |
| 5 | Text only | Networking reminder |
| 6 | Text + Video | Workshop recap |
| 7 | Text + Video | Keynote highlight |
| 8 | Text only | Motivational quote |
| 9 | Text + Image | Event announcement |
| 10 | Text only | Thank you message |

### Video Source

Mux provides a demo playback ID for testing: `OfjbQ3esQifgboENTs4oDXslCP5sSnst` (Big Buck Bunny sample video). This will be used for video posts.

### Image Sources

Using freely available placeholder images from Unsplash that are publicly accessible.

---

## Database Migration

Create a migration that inserts 10 posts:

```sql
-- Insert 10 test posts with variety of content types
INSERT INTO posts (user_id, content, is_global, image_url, video_url, moderation_status)
VALUES 
  -- Post 1: Text only (Leanna)
  ('18628588-8533-4472-8ab5-3704f4fc5414', 
   'Welcome to the Circle of Change Leadership Society! We are thrilled to have you as part of our community. Together, we will grow, learn, and lead with purpose. Let''s make this journey incredible! 🌟', 
   true, NULL, NULL, 'approved'),
  
  -- Post 2: Text only (admin)
  ('6d8fab70-f16c-4092-917c-0da9af673f9a', 
   'Leadership Tip of the Day: Great leaders don''t set out to be leaders. They set out to make a difference. It''s never about the role, always about the goal. What difference will you make today?', 
   true, NULL, NULL, 'approved'),
  
  -- Post 3: Text + Image (Leanna)
  ('18628588-8533-4472-8ab5-3704f4fc5414', 
   'What an incredible first day at our annual conference! The energy in the room was electric. Thank you to all our speakers and attendees for making this such a memorable experience.', 
   true, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', NULL, 'approved'),
  
  -- Post 4: Text + Image (member)
  ('f3387031-a52b-43f8-bf8c-f58abb023cde', 
   'Our leadership team ready to kick off another amazing workshop session! So grateful to work with such passionate and dedicated individuals. #TeamWork #Leadership', 
   true, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', NULL, 'approved'),
  
  -- Post 5: Text only (admin)
  ('6d8fab70-f16c-4092-917c-0da9af673f9a', 
   'Reminder: Our next networking session is coming up this Friday! Don''t forget to update your profile and add your LinkedIn URL so other members can connect with you. Looking forward to seeing everyone there!', 
   true, NULL, NULL, 'approved'),
  
  -- Post 6: Text + Video (Leanna)
  ('18628588-8533-4472-8ab5-3704f4fc5414', 
   'Here''s a quick recap from our leadership workshop on effective communication. Key takeaway: Listen more than you speak. When you truly listen, you understand not just words, but intentions.', 
   true, NULL, 'OfjbQ3esQifgboENTs4oDXslCP5sSnst', 'approved'),
  
  -- Post 7: Text + Video (admin)
  ('6d8fab70-f16c-4092-917c-0da9af673f9a', 
   'Missed our keynote session? Here''s a highlight from Dr. Johnson''s inspiring talk on ''Leading with Empathy in the Modern Workplace''. This is a must-watch for all aspiring leaders!', 
   true, NULL, 'OfjbQ3esQifgboENTs4oDXslCP5sSnst', 'approved'),
  
  -- Post 8: Text only (member)
  ('f3387031-a52b-43f8-bf8c-f58abb023cde', 
   '"The greatest leader is not the one who does the greatest things, but the one who gets people to do the greatest things." - Ronald Reagan

What quote inspires your leadership journey?', 
   true, NULL, NULL, 'approved'),
  
  -- Post 9: Text + Image (Leanna)
  ('18628588-8533-4472-8ab5-3704f4fc5414', 
   '📣 SAVE THE DATE! Our Spring Leadership Summit is officially scheduled for April 15-17. Early bird registration opens next week. This is going to be our biggest event yet!', 
   true, 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800', NULL, 'approved'),
  
  -- Post 10: Text only (admin)
  ('6d8fab70-f16c-4092-917c-0da9af673f9a', 
   'A heartfelt thank you to everyone who participated in this week''s mentorship sessions. Your commitment to growth and helping others grow is what makes this community special. Keep leading, keep inspiring! 💪', 
   true, NULL, NULL, 'approved');
```

---

## Post Distribution

- **Text only**: 5 posts (50%)
- **Text + Image**: 3 posts (30%)
- **Text + Video**: 2 posts (20%)

All posts are set to:
- `is_global = true` (visible to everyone)
- `moderation_status = 'approved'` (immediately visible)
- Distributed across the 3 available user profiles

---

## Result

After running this migration, the LMS feed will display 10 diverse test posts showing the full range of content types the platform supports.
