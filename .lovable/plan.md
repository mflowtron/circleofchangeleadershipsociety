

# Create "First Gen 2026" Test Event with Mock Data

## Overview

Based on the First-Generation Student Career Leadership Experience website, I'll create a comprehensive test event with realistic mock data including:
- 1 Event record
- 4 Ticket types (matching the conference structure)
- 2 Hotel records
- ~20 Orders (simulating group registrations from various schools)
- ~100 Attendees (distributed across orders)

---

## Event Details (from website)

| Field | Value |
|-------|-------|
| Title | 2026 First-Generation Student Career Leadership Experience |
| Slug | first-gen-2026 |
| Venue | Florida International University Biscayne Bay Campus |
| Address | 3000 NE 151st St, North Miami, FL 33181 |
| Dates | April 17-19, 2026 |
| Description | Three-day career leadership experience for first-generation students |

---

## Ticket Types to Create

| Name | Price | Description |
|------|-------|-------------|
| In-Person - Early Bird | $325.00 | Early bird rate (before Feb 27, 2026) - includes all sessions, workbook, lunch, t-shirt |
| In-Person - Regular | $350.00 | Standard in-person registration |
| Virtual - Early Bird | $150.00 | Early bird virtual rate (before Mar 25, 2026) |
| Virtual - Regular | $225.00 | Standard virtual registration |

---

## Hotels to Create

| Hotel | Address | Rate |
|-------|---------|------|
| Courtyard by Marriott Miami Aventura Mall | 2825 NE 191st Street, Aventura, FL 33180 | $239/night |
| Hampton Inn Hallandale Beach-Aventura | 1000 S Federal Hwy, Hallandale Beach, FL 33009 | $199/night |

---

## Mock Orders Structure

I'll create approximately 20 orders representing different registration scenarios:

| Type | Count | Tickets per Order | Total Attendees |
|------|-------|-------------------|-----------------|
| Large university groups | 4 | 10-15 students | ~50 |
| Medium groups | 6 | 3-5 students | ~24 |
| Small groups | 5 | 2 students | ~10 |
| Individual registrations | 5 | 1 student | ~5 |
| Virtual registrations | 4 | 2-4 students | ~11 |

**Total: ~100 attendees across ~20 orders**

---

## Sample Mock Data Sources

Universities for purchaser names and emails:
- UC Berkeley, UCLA, USC
- Penn State, University of North Texas
- Florida International University
- San Jose State, CSUSB, CSULA
- Norco College, Northern Virginia CC
- Various other institutions

First and last name pools for realistic attendee generation.

---

## Database Operations

### Step 1: Create Event
Insert into `events` table with the admin user as creator.

### Step 2: Create Ticket Types
Insert 4 ticket types linked to the event.

### Step 3: Create Hotels
Insert 2 hotel records with booking information.

### Step 4: Create Orders
Generate ~20 orders with:
- Unique order numbers (ORD-XXXXX format)
- Status: 'completed'
- Realistic purchaser names/emails
- Varied ticket quantities

### Step 5: Create Order Items
Each order gets corresponding order_items records linking tickets.

### Step 6: Create Attendees
For each order item, create individual attendee records:
- Some with names/emails filled in
- Some blank (simulating pending info)
- Track access assignments (Student or Advisor)
- Purchaser flagged with `is_purchaser = true`

---

## SQL Migration Approach

This will be implemented as a database migration with:

1. Event insert returning the new event_id
2. Ticket type inserts using that event_id
3. Hotel inserts using that event_id
4. Order generation using a CTE with generate_series for randomization
5. Order items creation linked to orders and ticket types
6. Attendee creation with realistic name distribution

The migration will use PostgreSQL features like:
- `gen_random_uuid()` for IDs
- `generate_series()` for bulk generation
- Arrays for name pools
- Random selection from arrays

---

## Expected Results

After execution:
- 1 new event visible in Event Management
- 4 ticket types available
- 2 hotels listed in travel info
- ~20 orders in the Orders dashboard
- ~100 attendees in the Attendees list
- Mix of complete and incomplete attendee records for realistic testing

