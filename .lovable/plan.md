

# Event Management System

## Overview

This plan adds a full-featured event management system to your app, similar to Eventbrite. The system will exist alongside your LMS with shared users but separate access controls. Key features include:

- **Public event pages** that anyone can browse and purchase tickets from
- **New "event_organizer" role** for dedicated event managers
- **Multiple ticket types** with different pricing (early bird, VIP, group discounts)
- **Stripe integration** for secure payments
- **Seamless LMS integration** - logged-in members can purchase with their account linked

## Architecture

The event system will have its own URL structure (`/events/*`) and visual identity while sharing the authentication system. Public visitors can browse and purchase without logging in, while LMS members who are logged in get their purchases linked to their account.

```text
+------------------+     +-------------------+     +------------------+
| Public Visitors  | --> | Event Pages       | --> | Stripe Checkout  |
| (no login)       |     | /events/[id]      |     | (guest checkout) |
+------------------+     +-------------------+     +------------------+
                               |
+------------------+           |
| LMS Members      | ----------+---------------> | Account-linked   |
| (logged in)      |                             | purchase history |
+------------------+                             +------------------+

+------------------+     +-------------------+
| Event Organizers | --> | Event Dashboard   |
| (new role)       |     | /events/manage    |
+------------------+     +-------------------+
```

## Database Schema

### New Tables

| Table | Purpose |
|-------|---------|
| `events` | Core event data (title, description, dates, venue, images) |
| `ticket_types` | Different ticket tiers per event (early bird, VIP, general) |
| `orders` | Purchase transactions linking buyer info to tickets |
| `order_items` | Individual tickets within an order |
| `event_images` | Gallery images for events |

### Role Updates

The existing `app_role` enum will be extended to include `event_organizer`:
- `admin` - Can manage everything (LMS + Events)
- `advisor` - LMS advisor access only
- `student` - LMS student access only
- `event_organizer` - Can create/manage events, no LMS access

### Schema Details

**events**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Event name |
| slug | text | URL-friendly identifier (unique) |
| description | text | Rich description |
| short_description | text | Summary for listings |
| venue_name | text | Location name |
| venue_address | text | Full address |
| starts_at | timestamptz | Event start time |
| ends_at | timestamptz | Event end time |
| cover_image_url | text | Main event image |
| is_published | boolean | Whether publicly visible |
| created_by | uuid | Organizer who created it |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**ticket_types**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | Foreign key to events |
| name | text | Ticket tier name (e.g., "Early Bird") |
| description | text | What's included |
| price_cents | integer | Price in cents (e.g., 2500 = $25.00) |
| quantity_available | integer | Total tickets available (null = unlimited) |
| quantity_sold | integer | Tickets sold so far |
| sales_start_at | timestamptz | When tickets go on sale |
| sales_end_at | timestamptz | When sales close |
| max_per_order | integer | Limit per purchase (default 10) |
| sort_order | integer | Display order |

**orders**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_number | text | Human-readable order ID |
| user_id | uuid | Optional - linked if logged in |
| email | text | Buyer's email (required) |
| full_name | text | Buyer's name |
| phone | text | Optional phone number |
| status | enum | pending, completed, cancelled, refunded |
| subtotal_cents | integer | Sum of ticket prices |
| fees_cents | integer | Service fees |
| total_cents | integer | Final amount charged |
| stripe_payment_intent_id | text | Stripe reference |
| created_at | timestamptz | Order creation time |
| completed_at | timestamptz | When payment completed |

**order_items**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_id | uuid | Foreign key to orders |
| ticket_type_id | uuid | Foreign key to ticket_types |
| quantity | integer | Number of tickets |
| unit_price_cents | integer | Price at time of purchase |
| attendee_name | text | Optional name for ticket |
| attendee_email | text | Optional email for ticket |

## Row-Level Security

| Table | Policy |
|-------|--------|
| events | SELECT: Published events visible to all, unpublished to creator/admin |
| events | INSERT/UPDATE/DELETE: `event_organizer` or `admin` |
| ticket_types | SELECT: Visible if event is visible |
| ticket_types | INSERT/UPDATE/DELETE: Event creator, `event_organizer`, or `admin` |
| orders | SELECT: Own orders (by user_id or email) or admin |
| orders | INSERT: Anyone (public checkout) |
| order_items | SELECT: Same as parent order |

## New Pages

| Route | Access | Purpose |
|-------|--------|---------|
| `/events` | Public | Browse all published events |
| `/events/[slug]` | Public | Event detail page with ticket purchase |
| `/events/[slug]/checkout` | Public | Multi-step checkout with Stripe |
| `/events/[slug]/checkout/success` | Public | Order confirmation |
| `/events/manage` | Organizers/Admin | Event management dashboard |
| `/events/manage/new` | Organizers/Admin | Create new event |
| `/events/manage/[id]` | Organizers/Admin | Edit event details |
| `/events/manage/[id]/tickets` | Organizers/Admin | Manage ticket types |
| `/events/manage/[id]/orders` | Organizers/Admin | View orders for event |

## New Components

### Public Event Components

| Component | Purpose |
|-----------|---------|
| `EventCard` | Event preview card for listings |
| `EventHero` | Large header with event details |
| `TicketSelector` | Choose ticket types and quantities |
| `CheckoutForm` | Collect attendee info and payment |
| `OrderConfirmation` | Show order details and tickets |

### Management Components

| Component | Purpose |
|-----------|---------|
| `EventForm` | Create/edit event details |
| `TicketTypeForm` | Add/edit ticket tiers |
| `OrdersTable` | View and search orders |
| `EventStats` | Tickets sold, revenue summary |

## Backend Functions

### Edge Functions

| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Create Stripe PaymentIntent, reserve tickets |
| `stripe-webhook` | Handle payment confirmation, fulfill order |
| `send-order-confirmation` | Email tickets after purchase |

### Database Functions

| Function | Purpose |
|----------|---------|
| `reserve_tickets` | Temporarily hold tickets during checkout |
| `complete_order` | Finalize order after payment |
| `generate_order_number` | Create readable order IDs |

## Payment Flow

```text
1. User selects tickets
         |
         v
2. POST /create-checkout-session
   - Validate ticket availability
   - Create pending order
   - Create Stripe PaymentIntent
   - Return client_secret
         |
         v
3. User completes Stripe payment form
         |
         v
4. Stripe webhook /stripe-webhook
   - Verify payment succeeded
   - Update order status to 'completed'
   - Increment quantity_sold on ticket_types
   - Trigger confirmation email
         |
         v
5. Redirect to success page with order details
```

## Implementation Phases

### Phase 1: Foundation
1. Enable Stripe integration
2. Create database tables and RLS policies
3. Add `event_organizer` to role enum
4. Create storage bucket for event images

### Phase 2: Event Management
1. Build event creation/editing pages
2. Build ticket type management
3. Add event listing for organizers

### Phase 3: Public Pages
1. Build public event listing page
2. Build event detail page
3. Build ticket selector component

### Phase 4: Checkout
1. Create checkout flow with Stripe Elements
2. Build edge functions for payment processing
3. Build order confirmation page

### Phase 5: Polish
1. Add order management for organizers
2. Add user purchase history (for logged-in users)
3. Email confirmations

## File Structure

```text
src/
├── pages/
│   └── events/
│       ├── Index.tsx              (public listing)
│       ├── EventDetail.tsx        (public detail)
│       ├── Checkout.tsx           (checkout flow)
│       ├── CheckoutSuccess.tsx    (confirmation)
│       └── manage/
│           ├── Index.tsx          (organizer dashboard)
│           ├── NewEvent.tsx       (create event)
│           ├── EditEvent.tsx      (edit event)
│           ├── ManageTickets.tsx  (ticket types)
│           └── EventOrders.tsx    (view orders)
├── components/
│   └── events/
│       ├── EventCard.tsx
│       ├── EventHero.tsx
│       ├── TicketSelector.tsx
│       ├── CheckoutForm.tsx
│       ├── OrderConfirmation.tsx
│       ├── EventForm.tsx
│       ├── TicketTypeForm.tsx
│       ├── OrdersTable.tsx
│       └── EventStats.tsx
├── hooks/
│   ├── useEvents.ts
│   ├── useTicketTypes.ts
│   ├── useOrders.ts
│   └── useCheckout.ts
└── layouts/
    └── EventsLayout.tsx           (public events layout)

supabase/
└── functions/
    ├── create-checkout-session/
    ├── stripe-event-webhook/
    └── send-order-confirmation/
```

## Visual Design

The public event pages will have a distinct but complementary look:
- Maintains the golden accent color from the LMS
- Clean, modern layout optimized for conversion
- Mobile-first design for easy ticket purchases
- Clear CTAs and pricing display

The management pages will use the existing sidebar navigation pattern for organizers/admins with a new "Events" section.

## Summary

This event management system provides:
- Public event pages accessible without login
- A new `event_organizer` role separate from LMS roles
- Multiple ticket types with flexible pricing
- Secure Stripe payment integration
- Seamless experience for logged-in LMS members
- Complete organizer dashboard for event management

