

# Create Mock Agenda and Speakers for First Gen 2026

## Overview

Based on the conference website, I'll create a comprehensive set of speakers and a full 3-day agenda for the "First Gen 2026" event (ID: `2e062f79-1693-4883-a3c5-623121810c57`).

---

## Speakers to Create (30 total)

### Keynote Speakers (6)
| Name | Title | Company |
|------|-------|---------|
| Dr. Joshua Fredenburg | President | Circle of Change Leadership Experience |
| Tish Norman | Founder and Principal Consultant | Transforming Leaders Now, Inc |
| Dr. Tierney Bates | Vice Chancellor for Student Affairs | University of South Carolina Upstate |
| David Coleman | Nationally Recognized Speaker | Coleman Speaks |
| Dr. Alex Ellis | Chief Executive Officer | Tied To Greatness |
| Silvana Marmelojos | Executive Producer | Living Latina Productions |

### College to Career Panel (5)
| Name | Title | Company |
|------|-------|---------|
| Dr. Paula Hopkins | Sr. Director of Strategy | PepsiCo |
| Charmion Kinder | Head, Office of Communications | Peace Corps |
| Beth Elletson | Founder & CEO | Abe |
| Clara Stroude Vazquez | Chief of Culture and Inclusion | Miami Heat |
| Johanne Wilson | Chief Creative Director | COOL Creative, Inc. |

### Entertainment Industry Panel (4)
| Name | Title | Company |
|------|-------|---------|
| Melissa Exposito | Managing Director Central America & Caribbean | Sony Music Entertainment |
| Tricia Patella | Vice President | Spinning Plates Management |
| Marilyn Santana | Chief Talent Officer & Founder | Blendemos, LLC |
| Corvaya Jefferies | Strategist & Manager, Audience Development | Revolt Media & TV |

### Business Panel (5)
| Name | Title | Company |
|------|-------|---------|
| Lauren Ziadia | Executive Director, Head of Women Without Limits | Morgan Stanley |
| Jenny Chen | Head of Marketing (Head of Brand) | Wild Fork |
| Chandler Bishop | Senior Copywriter | TBWA Chiat Day |
| Tatiana Oueini | Senior Vice President, People & Culture | Redwood Trust, Inc. |
| Ana Perez | Senior Manager, Supply Chain | Standard Aero |

### Tech Panel (4)
| Name | Title | Company |
|------|-------|---------|
| Michael Lay | Head of Inter-belief and ERGs | Google |
| Akwasi Owusu-Ansah | Senior Technical Recruiter | Indeed |
| Darie Dorlus | Engineering Manager | Gusto |
| Lacey Elmange | Executive Director | Inspire Leadership Network |

### Healthcare Panel (4)
| Name | Title | Company |
|------|-------|---------|
| Dr. Priscilla Torres | Chief Human Resource Officer | Health Choice Network |
| Joseph West | Managing Director | Capgenus |
| Dr. Dominique Leveille | Licensed Marriage And Family Therapist | BlissTherapy.Me |
| Jerson Dulis | Director of Outreach & Development | Broward Community & Family Health Centers |

### Education Panel (2)
| Name | Title | Company |
|------|-------|---------|
| Dr. Ryan Holmes | Associate Vice President for Student Affairs and Dean of Students | University of Miami |
| Dr. Janett I. Cordoves | Senior Program Director | Presidents Consortium Institute for Citizens & Scholars |

---

## Agenda Items to Create

### Day 1: Friday, April 17, 2026 (12 items)

| Time | Title | Type | Speaker(s) |
|------|-------|------|------------|
| 9:00 AM - 10:30 AM | Morning Keynote: Positioning Yourself for Career Success | session | Dr. Joshua Fredenburg |
| 10:45 AM - 12:15 PM | Career Development Empowerment Session | session | 4 panelists |
| 12:15 PM - 1:30 PM | Lunch & Networking | meal | - |
| 1:30 PM - 2:00 PM | Fire-Side Career Development Chat #1: Tech Industry | session | Michael Lay, Darie Dorlus |
| 2:15 PM - 2:45 PM | Fire-Side Career Development Chat #2: Entertainment Industry | session | Melissa Exposito, Tricia Patella |
| 3:00 PM - 3:30 PM | Fire-Side Career Development Chat #3: Q&A Session | session | Panel of speakers |
| 3:30 PM - 3:45 PM | Snack Break | break | - |
| 3:45 PM - 4:30 PM | Closing Session & Prize Giveaway | session | Dr. Alex Ellis |
| 4:30 PM - 5:30 PM | Book-Signing, Networking & Professional Headshots | networking | - |

### Day 2: Saturday, April 18, 2026 (10 items)

| Time | Title | Type | Speaker(s) |
|------|-------|------|------------|
| 9:00 AM - 10:30 AM | Morning Keynote: Building Resilience as a First-Gen Professional | session | Tish Norman |
| 10:45 AM - 12:00 PM | Career Leadership Panel: Business Leaders | session | Business panel (5 speakers) |
| 12:00 PM - 1:15 PM | Lunch & Interactive Games | meal | - |
| 1:15 PM - 2:15 PM | Style-Shop: The Ultimate Dress for Success Intensive | session | Silvana Marmelojos |
| 2:30 PM - 3:30 PM | Career Leadership Panel: Tech Industry | session | Tech panel (4 speakers) |
| 3:45 PM - 4:30 PM | Career Leadership Panel: Healthcare Industry | session | Healthcare panel (4 speakers) |
| 4:30 PM - 5:30 PM | First-Gen Career & Leadership Society Induction Ceremony | session | Dr. Joshua Fredenburg |

### Day 3: Sunday, April 19, 2026 (3 items)

| Time | Title | Type | Speaker(s) |
|------|-------|------|------------|
| 10:00 AM - 12:00 PM | Miami Beach Day Excursion - Morning Session | networking | - |
| 12:00 PM - 1:00 PM | Beach Lunch & Networking | meal | - |
| 1:00 PM - 4:00 PM | Miami Beach Day Excursion - Afternoon Activities | networking | - |

---

## Database Operations

### Step 1: Insert 30 Speakers
Insert all speakers into the `speakers` table linked to event_id `2e062f79-1693-4883-a3c5-623121810c57` with:
- Name, title, company
- Bio generated based on their role
- Sort order based on category (keynotes first, then panels)

### Step 2: Insert 22 Agenda Items
Insert all agenda items into the `agenda_items` table with:
- Proper timestamps for April 17-19, 2026 (EST timezone)
- item_type: session, meal, break, or networking
- Locations assigned (Main Ballroom, Panel Room A, Beach Area, etc.)
- Track assignments where applicable (Main Track, Industry Panels)

### Step 3: Link Speakers to Agenda Items
Insert records into `agenda_item_speakers` table to:
- Assign keynote speakers to their sessions
- Assign panelists to panel sessions with appropriate roles (speaker, panelist, moderator)

---

## SQL Migration Approach

A single SQL migration script will:

1. Insert all 30 speakers with realistic bios
2. Insert all 22 agenda items across 3 days
3. Create speaker-to-agenda-item linkages with proper roles

The migration will use CTEs to:
- Store speaker IDs for reference when linking to agenda items
- Maintain referential integrity between tables

---

## Expected Results

After execution:
- 30 speakers visible in the Speakers management page
- 22 agenda items visible in the Agenda builder (calendar view)
- Proper speaker assignments showing on each session
- 3-day agenda spanning April 17-19, 2026
- Mix of session types: keynotes, panels, meals, breaks, networking

