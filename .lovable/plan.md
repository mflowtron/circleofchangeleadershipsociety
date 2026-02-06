

# Transform Event Detail Page into Beautiful Landing Experience

## Overview

Redesign the `/events/:slug` page from a simple event detail view into an immersive, premium landing page experience inspired by firstgencareerconference.com. The page will feature a dramatic hero section, improved information hierarchy, featured speakers showcase, and refined visual polish using the project's golden premium design system.

## Current vs. Proposed

| Aspect | Current | Proposed |
|--------|---------|----------|
| Hero | Simple cover image with standard aspect ratio | Full-width hero with gradient overlay, centered branding, tagline |
| Layout | 2-column grid starting immediately | Hero-first, then sectioned content with visual breathing room |
| Speakers | Only shown inline in agenda items | Dedicated "Featured Speakers" section with cards |
| Visual style | Functional cards | Premium glassmorphism, gradients, animations |
| CTA | Sticky sidebar ticket card | Hero CTA + floating mobile bar + sidebar |

---

## Design Structure

```text
+----------------------------------------------------------+
|                    FULL-WIDTH HERO                        |
|  [Cover image as background with dark gradient overlay]   |
|                                                          |
|           [Logo/Branding - optional if in event]         |
|                    EVENT TITLE                           |
|            "Short description / tagline"                 |
|                                                          |
|    [Date icon] Date  [Location icon] Venue               |
|                                                          |
|              [ Get Tickets - Primary CTA ]               |
|                                                          |
|   [Social icons row - if we add social links later]      |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  QUICK INFO BAR (scrolls with page)                      |
|  [Calendar] Date & Time | [MapPin] Location | [Ticket]   |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  ABOUT THIS EVENT                                        |
|  Rich description with proper typography and spacing     |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  FEATURED SPEAKERS (if speakers exist)                   |
|  Grid of speaker cards with photos, names, titles        |
|  Premium card styling with hover effects                 |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  SCHEDULE (existing agenda component)                    |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  LOCATION                                                |
|  Enhanced venue card with map placeholder/address        |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  TICKETS SECTION (mobile-friendly alternative to sidebar)|
|  Ticket options with Get Tickets CTA                     |
+----------------------------------------------------------+

SIDEBAR (lg+ screens): Sticky ticket purchase card
MOBILE: Floating bottom CTA bar for tickets
```

---

## Implementation Details

### 1. Create New Component: EventHero

**File:** `src/components/events/EventHero.tsx`

A dramatic hero section component that:
- Uses cover image as full-width background
- Applies a dark gradient overlay for text readability
- Centers the event title and tagline
- Shows date and location with icons
- Includes a primary CTA button
- Uses premium animations (fade-up, stagger)

### 2. Create New Component: EventSpeakersSection

**File:** `src/components/events/EventSpeakersSection.tsx`

A featured speakers grid that:
- Fetches speakers using `useSpeakers` hook
- Displays a responsive grid of speaker cards
- Uses premium card styling with hover lift effects
- Shows photo, name, title, company
- Links to social profiles if available

### 3. Create New Component: EventQuickInfo

**File:** `src/components/events/EventQuickInfo.tsx`

A horizontal info bar showing:
- Date and time with Calendar icon
- Location with MapPin icon
- Quick visual reference for key event details

### 4. Create New Component: EventLocationSection

**File:** `src/components/events/EventLocationSection.tsx`

Enhanced location display with:
- Larger, more prominent venue card
- Address with proper formatting
- Optional: Google Maps embed placeholder

### 5. Create New Component: EventTicketsSection

**File:** `src/components/events/EventTicketsSection.tsx`

Mobile-friendly tickets section:
- Full-width on mobile (replaces sidebar)
- Ticket type cards with pricing
- Prominent CTA

### 6. Create New Component: FloatingTicketBar

**File:** `src/components/events/FloatingTicketBar.tsx`

Mobile-only floating bottom bar:
- Shows on scroll (after hero)
- Displays starting price and Get Tickets button
- Glass effect background

### 7. Refactor EventDetail Page

**File:** `src/pages/events/EventDetail.tsx`

Restructure the page to:
- Remove the simple cover image, use EventHero instead
- Add EventQuickInfo below hero
- Keep About section but enhance typography
- Add EventSpeakersSection before Schedule
- Keep AgendaPublicView (Schedule)
- Use EventLocationSection instead of simple card
- On desktop: keep sticky sidebar tickets
- On mobile: hide sidebar, show EventTicketsSection + FloatingTicketBar

---

## Visual Enhancements

### Hero Styling
```css
/* Gradient overlay for hero */
background: linear-gradient(
  to top,
  hsl(30 12% 8% / 0.95) 0%,
  hsl(30 12% 8% / 0.7) 40%,
  hsl(30 12% 8% / 0.4) 100%
);
```

### Premium Card Effects
- Use `card-premium` class for speaker cards
- Add `hover-lift` for interactive feedback
- Apply `stagger-children` for entrance animations

### Typography
- Event title: `text-4xl lg:text-5xl font-bold`
- Tagline: `text-lg lg:text-xl text-muted-foreground`
- Section headings: `text-2xl font-semibold` with subtle gold accent

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/events/EventHero.tsx` | Full-width hero with cover image background |
| `src/components/events/EventSpeakersSection.tsx` | Featured speakers grid |
| `src/components/events/EventQuickInfo.tsx` | Horizontal quick info bar |
| `src/components/events/EventLocationSection.tsx` | Enhanced venue display |
| `src/components/events/EventTicketsSection.tsx` | Mobile-friendly ticket section |
| `src/components/events/FloatingTicketBar.tsx` | Mobile floating CTA bar |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/events/EventDetail.tsx` | Major restructure to use new components |

---

## Responsive Behavior

### Desktop (lg+)
- Full hero experience
- Two-column layout: content + sticky ticket sidebar
- Speaker cards in 3-column grid

### Tablet (md)
- Hero with slightly reduced padding
- Full-width content with ticket section inline
- Speaker cards in 2-column grid

### Mobile (sm and below)
- Hero optimized for vertical space
- Floating ticket bar at bottom
- Speaker cards in 1-column stack
- All sections full-width

---

## Data Requirements

Uses existing data from:
- `useEvent(slug)` - Event details
- `useTicketTypes(eventId)` - Ticket information
- `useSpeakers(eventId)` - Speaker information (new addition to page)
- `useAgendaItems(eventId)` - Schedule (via AgendaPublicView)

No database changes required.

