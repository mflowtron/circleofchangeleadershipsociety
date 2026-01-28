
# Track Individual Attendees for Event Registrations

## Overview
Enable tracking of individual attendees separate from registrations/orders. This allows advisors or group leaders to purchase multiple tickets at once and later provide details (names, emails) for each individual attendee, making it easy to contact each person for follow-up registration forms.

## Current Situation
- **Orders table**: Stores buyer/registrant info (the advisor making the purchase)
- **Order_items table**: Stores ticket line items with a `quantity` field
- **Problem**: When quantity > 1, there's no way to track individual attendees - only one `attendee_name`/`attendee_email` per line item

## What You'll Get
- New **Attendees** tab in the Event Orders page showing all individual attendees
- Ability for purchasers to add/edit attendee details after checkout via a unique link
- Admin ability to view and edit attendee information
- Export attendees to CSV for mail merges or further outreach
- Track which attendees have completed their information

## Data Model Changes

### New `attendees` Table
```text
attendees
├── id (uuid, primary key)
├── order_id (uuid, references orders)
├── order_item_id (uuid, references order_items)
├── ticket_type_id (uuid, references ticket_types)
├── attendee_name (text, nullable)
├── attendee_email (text, nullable)
├── additional_info (jsonb, nullable) - for future custom fields
├── created_at (timestamp)
├── updated_at (timestamp)
```

When an order is completed, the system will create one `attendee` row for each ticket purchased. For example:
- Order for 20 "General Admission" tickets → 20 attendee rows created
- Purchaser or admin can then fill in names/emails for each

## Implementation Steps

### Step 1: Create Database Table
- Create `attendees` table with RLS policies
- RLS: Order owners (by user_id) can edit their attendees; event organizers/admins can view/edit all
- Create a secure token column on orders for allowing guest editing without login

### Step 2: Update Checkout Flow
- After successful checkout, create attendee rows for each ticket purchased
- Update `create-event-checkout` edge function to generate attendee records

### Step 3: Create Attendee Management Page
- New page: `/events/:slug/order/:orderId/attendees`
- Allows the purchaser to fill in attendee details
- Accessible via email link sent after purchase (token-based access for guests)
- Mobile-friendly form with name/email for each attendee

### Step 4: Update Event Orders Dashboard
- Add "Attendees" tab to EventOrders page
- Show all attendees across all orders with their status (info complete/incomplete)
- Filter by ticket type, completion status
- Inline editing for admins
- Enhanced CSV export with all attendee details

### Step 5: Add Order Success Page Link
- Update CheckoutSuccess page to show "Add Attendee Details" button
- Link purchasers to the attendee management page

## New Pages/Components
- `src/pages/events/OrderAttendees.tsx` - Public page for purchasers to add attendee info
- `src/components/events/AttendeeForm.tsx` - Form for individual attendee details
- `src/components/events/AttendeesTable.tsx` - Admin table showing all attendees
- `src/hooks/useAttendees.ts` - Data hooks for attendee operations

## Files to Modify
- `supabase/functions/create-event-checkout/index.ts` - Create attendee records after order
- `supabase/functions/verify-event-payment/index.ts` - Create attendees on payment verification
- `src/pages/events/CheckoutSuccess.tsx` - Add link to attendee form
- `src/pages/events/manage/EventOrders.tsx` - Add Attendees tab
- `src/App.tsx` - Add new route

## User Flows

### Purchaser Flow (Advisor registering students)
1. Advisor goes to checkout, selects 20 "Student" tickets
2. Enters their own name/email as the buyer
3. Completes payment
4. On success page, sees "Add Attendee Details" button
5. Opens attendee form, enters names/emails for each student
6. Can save partial progress and return later via email link

### Admin Flow
1. Go to Event → Orders & Attendees
2. New "Attendees" tab shows all individual attendees
3. Can see which attendees have incomplete information
4. Can filter, search, and inline edit attendee details
5. Export complete attendee list to CSV
