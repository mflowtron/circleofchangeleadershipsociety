
# Create First Generation Student Career Leadership Experience Test Event

## Summary

Create a complete test event based on the 2026 First Generation Student Career Leadership Experience website, including the event itself, speakers, agenda items, ticket types, orders, and 100 attendees.

---

## Data Extracted from Website

### Event Details
| Field | Value |
|-------|-------|
| Title | 2026 First Generation Student Career Leadership Experience |
| Dates | April 17-19, 2026 |
| Venue | Florida International University Biscayne Bay Campus |
| Location | Miami, FL |
| Timezone | America/New_York (EST) |

### Ticket Types
| Type | Price | Early Bird |
|------|-------|------------|
| In-Person Registration | $350.00 | $325.00 (by Feb 27) |
| Virtual Registration | $225.00 | $150.00 (by Mar 25) |

### Speakers (30 speakers from website - photos already exist in `src/assets/speakers/`)
The project already has speaker photos for all 30 speakers listed on the website.

### Agenda Schedule (3 days)
**Friday, April 17:**
- Morning Keynote (9:00-10:30)
- Career Development Empowerment (10:45-12:15)
- Lunch (12:15-1:30)
- Fire-Side Chat #1 (1:30-2:00)
- Fire-Side Chat #2 (2:15-2:45)
- Fire-Side Chat #3 (3:00-3:30)
- Snack Break (3:30-3:45)
- Closing Speaker (3:45-4:30)
- Book-Signing & Headshots (4:30-5:30)

**Saturday, April 18:**
- Morning Keynote (9:00-10:30)
- Career Leadership Panel (10:45-12:00)
- Lunch (12:00-1:15)
- Style-Shop Workshop (1:15-2:15)
- Career Leadership Panel #2 (2:30-4:15)
- Society Induction & Awards (4:30-5:30)

**Sunday, April 19:**
- Miami Beach Day Excursion (10:00-4:00)

### Hotel Information
1. **Courtyard by Marriott Miami Aventura Mall** - $239/night
2. **Hampton Inn Hallandale Beach-Aventura** - $199/night

---

## Implementation Steps

### Step 1: Create the Event
Insert into `events` table with:
- Title, description, venue info from website
- Cover image from website hero
- Travel info and hotel details
- Published status = true
- Timezone = America/New_York

### Step 2: Create Ticket Types
Insert 4 ticket types:
1. In-Person Early Bird ($325)
2. In-Person Standard ($350)
3. Virtual Early Bird ($150)
4. Virtual Standard ($225)

### Step 3: Create Speakers (30 speakers)
Insert all speakers with:
- Names and titles from website
- Company/organization
- Photo URLs using local assets or website URLs
- LinkedIn placeholder URLs

### Step 4: Create Agenda Items (18 sessions across 3 days)
Insert all sessions with:
- Proper timestamps for April 17-19, 2026
- Session types (keynote, session, break, meal)
- Descriptions from website
- Speaker assignments where applicable

### Step 5: Create Orders (distributing 100 attendees)
Create ~35 orders with varying ticket quantities:
- Mix of in-person and virtual tickets
- Random order numbers and emails
- Status = completed

### Step 6: Create Attendees (100 total)
Create 100 attendee records:
- Linked to order items
- Realistic names and emails
- Mix of track access

---

## Database Operations Summary

| Table | Records to Create |
|-------|-------------------|
| events | 1 |
| ticket_types | 4 |
| speakers | 30 |
| agenda_items | 18 |
| orders | ~35 |
| order_items | ~35 |
| attendees | 100 |

---

## Technical Notes

### Photo URLs
Speaker photos will use the URLs from the website:
```
https://www.firstgencareerconference.com/wp-content/uploads/2024/11/Tish-Norman-284x260.png
https://www.firstgencareerconference.com/wp-content/uploads/2021/03/Dr.-Tierney-Bates-284x260.png
... (and so on for all 30 speakers)
```

### Cover Image
Use the hero banner or a conference photo from the website.

### Event Created By
Will use existing admin user: `18628588-8533-4472-8ab5-3704f4fc5414` (Leanna Mouton)

### Order Generation
Orders will be generated with:
- Unique order numbers (e.g., FG-2026-0001)
- Random realistic email addresses
- Random quantities (1-4 tickets per order)
- Completed status with stripe placeholder IDs

### Attendee Names
Will generate 100 realistic names using a mix of first and last names common in diverse student populations.

---

## SQL Migration Outline

The migration will execute in this order:

```sql
-- 1. Insert event
INSERT INTO events (id, title, slug, description, ...) VALUES (...);

-- 2. Insert ticket types
INSERT INTO ticket_types (event_id, name, price_cents, ...) VALUES (...);

-- 3. Insert speakers
INSERT INTO speakers (event_id, name, title, company, photo_url, ...) VALUES (...);

-- 4. Insert agenda items
INSERT INTO agenda_items (event_id, title, starts_at, ends_at, item_type, ...) VALUES (...);

-- 5. Insert orders
INSERT INTO orders (id, event_id, order_number, email, status, ...) VALUES (...);

-- 6. Insert order items
INSERT INTO order_items (order_id, ticket_type_id, quantity, unit_price_cents) VALUES (...);

-- 7. Insert attendees
INSERT INTO attendees (order_item_id, attendee_name, attendee_email, ...) VALUES (...);
```

---

## Result

After implementation, the system will have:
- 1 fully populated event visible at `/events/first-gen-career-conference-2026`
- 30 speakers with photos and bios
- 18 agenda items across 3 days
- 4 ticket types (2 in-person, 2 virtual)
- ~35 orders totaling 100 attendees
- Full hotel and travel information
