

# Add Dummy Content for Event Detail Page

## Overview

Populate the "First Gen 2026" event with rich dummy content so all the new components display properly. This includes updating the event with a description, cover image, and enhancing speakers with photos and social links.

## Current State

| Content | Status |
|---------|--------|
| Event description | Missing |
| Event short_description | Missing |
| Cover image | Missing |
| Speaker photos | Missing (5 speakers exist) |
| Speaker social links | Missing |
| Ticket types | Exists (1 type) |
| Agenda items | Exist (5+ items) |

## Changes Required

### 1. Update Event with Description and Cover Image

Update the `firstgen2026` event to include:
- A compelling description about the conference
- A short tagline/description for the hero
- A cover image URL (using a professional stock image from Unsplash)

```sql
UPDATE events 
SET 
  description = 'The First Gen Career Conference is the premier gathering for first-generation college students and professionals. Join us for three transformative days of workshops, keynotes, and networking designed specifically for those breaking barriers in higher education and the workforce.

Our 2026 conference brings together industry leaders, successful first-gen alumni, and expert career coaches to share insights on navigating professional environments, building networks, and achieving success while staying true to your roots.

Whether you are currently in school, recently graduated, or advancing in your career, this conference offers practical skills, meaningful connections, and the inspiration to reach your full potential.',
  short_description = 'Empowering first-generation students and professionals to break barriers and build successful careers.',
  cover_image_url = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80'
WHERE slug = 'firstgen2026';
```

### 2. Update Speakers with Photos and Social Links

Add professional headshot URLs and social media links to the existing speakers:

```sql
-- Dr. Sarah Chen
UPDATE speakers SET 
  photo_url = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
  linkedin_url = 'https://linkedin.com/in/example',
  twitter_url = 'https://twitter.com/example',
  website_url = 'https://example.com'
WHERE id = '1315a07b-638c-4939-a737-196e2b846c6b';

-- Marcus Johnson
UPDATE speakers SET 
  photo_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  linkedin_url = 'https://linkedin.com/in/example'
WHERE id = 'b333ffa8-a957-40f6-807f-f7bece4ae23f';

-- Dr. Emily Rodriguez
UPDATE speakers SET 
  photo_url = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
  linkedin_url = 'https://linkedin.com/in/example',
  website_url = 'https://example.com'
WHERE id = '5b2a046f-928c-4264-8345-420ae6d1e2df';

-- James Williams
UPDATE speakers SET 
  photo_url = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  linkedin_url = 'https://linkedin.com/in/example'
WHERE id = 'c8401f26-2199-440f-89a5-f51e69c4556c';

-- Lisa Thompson
UPDATE speakers SET 
  photo_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  linkedin_url = 'https://linkedin.com/in/example',
  twitter_url = 'https://twitter.com/example'
WHERE id = '76ab27c0-d96b-4603-93a8-56b9b54299fb';
```

### 3. Add Additional Ticket Type

Add a VIP ticket option for variety:

```sql
INSERT INTO ticket_types (event_id, name, description, price_cents, quantity_available, max_per_order, sort_order, sales_start_at, sales_end_at)
VALUES (
  '8b666936-1622-4d84-9787-3e95e54059b8',
  'VIP All-Access Pass',
  'Includes priority seating, exclusive networking sessions, speaker meet-and-greet, and swag bag.',
  50000,
  50,
  5,
  1,
  '2026-01-01 20:00:00+00',
  '2026-05-20 21:10:00+00'
);
```

---

## Result

After these updates, the event page will display:

| Section | Content |
|---------|---------|
| Hero | Cover image background, title, tagline, date/venue info |
| About | Full event description with multiple paragraphs |
| Speakers | 5 speakers with photos and social links |
| Schedule | Existing agenda items (already populated) |
| Location | Venue name and address (already populated) |
| Tickets | 2 ticket types with pricing |

---

## Images Used

All images are from Unsplash (free to use):

- **Cover**: Conference/event photo - professional gathering
- **Dr. Sarah Chen**: Professional woman headshot
- **Marcus Johnson**: Professional man headshot  
- **Dr. Emily Rodriguez**: Professional woman headshot
- **James Williams**: Professional man headshot
- **Lisa Thompson**: Professional woman headshot

