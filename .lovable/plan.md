

# Add Hotel & Travel Information to Event Detail Page

## Overview

Add a "Hotel & Travel Information" section to the event detail page, similar to the reference website (firstgencareerconference.com). This includes creating a new database table to store hotel information per event, a new UI component to display the hotels, and populating dummy data.

## Reference Content Analysis

The reference website includes:
- Section header: "HOTEL & TRAVEL INFORMATION"
- Introductory text about the conference location
- Two hotel options, each with:
  - Hotel image
  - Hotel name
  - Full address
  - Phone number
  - Description/amenities info
  - Rate per night
  - "Reserve Now" booking link
- Contact email for travel questions

---

## Database Changes

### New Table: event_hotels

Store hotel recommendations for each event.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | Foreign key to events |
| name | text | Hotel name |
| address | text | Full address |
| phone | text | Phone number (optional) |
| description | text | Hotel description |
| image_url | text | Hotel image URL (optional) |
| rate_description | text | e.g., "$199.00 per night" |
| booking_url | text | Direct booking link (optional) |
| sort_order | integer | Display order |
| created_at | timestamptz | Auto timestamp |

```sql
CREATE TABLE public.event_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  description TEXT,
  image_url TEXT,
  rate_description TEXT,
  booking_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_hotels ENABLE ROW LEVEL SECURITY;

-- Public read access (event hotels are public info)
CREATE POLICY "Anyone can view event hotels"
  ON public.event_hotels
  FOR SELECT
  USING (true);
```

### Update Events Table

Add a travel info text field for the introductory paragraph and contact email.

```sql
ALTER TABLE public.events
ADD COLUMN travel_info TEXT,
ADD COLUMN travel_contact_email TEXT;
```

---

## New Components

### 1. EventTravelSection.tsx

A new section component that displays:
- Section heading with travel icon
- Introductory travel info text (if provided)
- Grid/stack of hotel cards
- Contact email link for questions

### 2. HotelCard.tsx (internal to EventTravelSection)

Individual hotel card displaying:
- Hotel image (or placeholder)
- Hotel name
- Address
- Phone number
- Description
- Rate highlighted
- "Reserve Now" button linking to booking URL

---

## Component Design

```text
+----------------------------------------------------------+
|  HOTEL & TRAVEL INFORMATION                              |
|  [Plane icon or Building icon]                           |
+----------------------------------------------------------+
|                                                          |
|  [Introductory paragraph about travel to the event]      |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  +-------------------------+  +-------------------------+|
|  |  [Hotel Image]          |  |  [Hotel Image]          ||
|  |                         |  |                         ||
|  |  **Courtyard Marriott** |  |  **Hampton Inn**        ||
|  |  2825 NE 191st Street   |  |  1000 S Federal Hwy     ||
|  |  Aventura, FL 33180     |  |  Hallandale Beach, FL   ||
|  |  Phone: 305-937-0805    |  |  Phone: 954-874-1111    ||
|  |                         |  |                         ||
|  |  Description text...    |  |  Description text...    ||
|  |                         |  |                         ||
|  |  **$239.00/night**      |  |  **$199.00/night**      ||
|  |                         |  |                         ||
|  |  [Reserve Now]          |  |  [Reserve Now]          ||
|  +-------------------------+  +-------------------------+|
|                                                          |
|  Questions? Contact: circleofchange@email.com            |
|                                                          |
+----------------------------------------------------------+
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/events/EventTravelSection.tsx` | Travel & hotel section component |
| `src/hooks/useEventHotels.ts` | Hook to fetch hotels for an event |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/events/EventDetail.tsx` | Add EventTravelSection between Location and Tickets |

---

## Dummy Data to Insert

### Update Event with Travel Info

```sql
UPDATE events SET
  travel_info = 'Our leadership team has reserved two hotels for conference participants to consider while attending the First Gen 2026 conference in Miami, Florida. Both hotels are conveniently located 5-15 minutes from the conference venue.',
  travel_contact_email = 'circleofchangeleadconference@gmail.com'
WHERE slug = 'firstgen2026';
```

### Insert Hotel Options

```sql
-- Courtyard by Marriott
INSERT INTO event_hotels (event_id, name, address, phone, description, image_url, rate_description, booking_url, sort_order)
VALUES (
  '8b666936-1622-4d84-9787-3e95e54059b8',
  'Courtyard by Marriott Miami Aventura Mall',
  '2825 NE 191st Street, Aventura, FL 33180',
  '305-937-0805',
  'Located just 5-15 minutes from the conference venue. Within walking distance of a huge shopping mall, tons of restaurants, and a 25-minute drive to the beach in Sunny Isles.',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  '$239.00 per night',
  'https://www.marriott.com/event-reservations/reservation-link.mi?id=1765999550023&key=GRP&app=resvlink',
  0
);

-- Hampton Inn
INSERT INTO event_hotels (event_id, name, address, phone, description, image_url, rate_description, booking_url, sort_order)
VALUES (
  '8b666936-1622-4d84-9787-3e95e54059b8',
  'Hampton Inn Hallandale Beach-Aventura',
  '1000 S Federal Hwy, Hallandale Beach, FL 33009',
  '954-874-1111',
  'Located 5-15 minutes from the conference venue. Within walking distance are tons of restaurants, a nice shopping plaza with nightlife options, and a 20-minute drive to the beach in Sunny Isles.',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  '$199.00 per night',
  'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=FLLHDHX&arrivalDate=2026-04-16&departureDate=2026-04-20&groupCode=CHH90Y',
  1
);
```

---

## Implementation Steps

1. **Database Migration**: Create `event_hotels` table and add travel columns to events
2. **Create Hook**: `useEventHotels.ts` to fetch hotels by event ID
3. **Create Component**: `EventTravelSection.tsx` with hotel cards
4. **Update Page**: Add section to `EventDetail.tsx`
5. **Insert Data**: Populate with dummy hotel content

---

## Result

After implementation, the event page will include a new "Hotel & Travel Information" section displaying:

| Element | Content |
|---------|---------|
| Section heading | "Hotel & Travel Information" with icon |
| Intro text | Travel info paragraph from event |
| Hotel cards | 2 hotel options with images, details, rates, booking links |
| Contact | Email link for travel questions |

