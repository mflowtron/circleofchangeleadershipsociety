

# Populate Agenda with Test Items

## Overview

Seed the agenda for the "First Gen 2026" event with realistic test items spanning today through 3 days from now. This will include a mix of sessions, breaks, meals, and networking events across multiple tracks.

## Target Event

- **Event ID**: `8b666936-1622-4d84-9787-3e95e54059b8`
- **Event Title**: First Gen 2026

## Test Data Structure

### Speakers (5 speakers)

| Name | Title | Company |
|------|-------|---------|
| Dr. Sarah Chen | Director of Student Success | State University |
| Marcus Johnson | Career Development Coach | TechCorp |
| Dr. Emily Rodriguez | Professor of Education | Community College |
| James Williams | Alumni Relations Manager | First Gen Foundation |
| Lisa Thompson | Wellness Coordinator | Student Services |

### Agenda Items (3-day schedule)

**Day 1 (Today)**
- 9:00 AM - Registration & Welcome Coffee (networking, 30 min)
- 9:30 AM - Opening Keynote: "Breaking Barriers" (session, 1 hr, highlighted, Main Stage)
- 10:30 AM - Morning Break (break, 15 min)
- 10:45 AM - Workshop: Resume Building (session, 1 hr, Workshop Room A)
- 10:45 AM - Workshop: Financial Literacy (session, 1 hr, Workshop Room B)
- 12:00 PM - Lunch (meal, 1 hr)
- 1:00 PM - Panel: Career Pathways (session, 1.5 hr, Main Stage)
- 2:30 PM - Afternoon Break (break, 15 min)
- 2:45 PM - Networking Session (networking, 1 hr)
- 3:45 PM - Closing Remarks Day 1 (session, 15 min, Main Stage)

**Day 2 (Tomorrow)**
- 9:00 AM - Morning Coffee (networking, 30 min)
- 9:30 AM - Keynote: "Navigating Academia" (session, 1 hr, highlighted, Main Stage)
- 10:30 AM - Break (break, 15 min)
- 10:45 AM - Workshop: Study Skills (session, 1 hr, Workshop Room A)
- 10:45 AM - Workshop: Mental Health (session, 1 hr, Workshop Room B)
- 12:00 PM - Lunch (meal, 1 hr)
- 1:00 PM - Alumni Mentorship Circles (networking, 1.5 hr)
- 2:30 PM - Break (break, 15 min)
- 2:45 PM - Workshop: Grad School Prep (session, 1 hr, Workshop Room A)
- 4:00 PM - Day 2 Wrap-up (session, 30 min, Main Stage)

**Day 3 (Day after tomorrow)**
- 9:00 AM - Breakfast Mixer (meal, 1 hr)
- 10:00 AM - Keynote: "Your First Gen Story" (session, 1 hr, highlighted, Main Stage)
- 11:00 AM - Break (break, 15 min)
- 11:15 AM - Lightning Talks (session, 45 min, Main Stage)
- 12:00 PM - Farewell Lunch (meal, 1.5 hr)
- 1:30 PM - Closing Ceremony (session, 30 min, highlighted, Main Stage)

## Implementation

A single database migration will:
1. Insert 5 speakers for the event
2. Insert ~25 agenda items with proper timestamps calculated from `now()`
3. Assign speakers to relevant sessions via `agenda_item_speakers`

### Technical Notes

- Timestamps use `now()` with interval arithmetic to ensure items are always relative to when the migration runs
- Tracks: "Main Stage", "Workshop Room A", "Workshop Room B"
- Item types distributed across: session, break, meal, networking
- Highlighted items for keynotes

