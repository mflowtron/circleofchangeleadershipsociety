
# Add Order Detail Page with Attendees & Cross-Linking

## Overview
Enable navigation between Orders and Attendees by:
1. Making Order # clickable in the Attendees table to navigate to an Order detail page
2. Creating a dedicated Order Detail page that displays the order info along with its associated attendees

## Current State
- Attendees table shows Order # as plain text
- Orders table has inline expansion but no dedicated detail page
- No way to see which attendees belong to a specific order from the Orders view

## Proposed Solution

### New Order Detail Page
Create `/events/manage/orders/:orderId` route with:
- Order header (order number, date, status)
- Customer information (name, email, phone)
- Order items breakdown (ticket types, quantities, prices)
- **Attendees section** showing all attendees for this order with their completion status
- Link back to the event's orders page

### Attendees Table Enhancement
- Make the "Order #" column a clickable link that navigates to the Order Detail page
- Add visual indication (underline, color) that it's clickable

### Orders Table Enhancement
- Add a "View" button/link in the actions area to navigate to Order Detail page
- Keep the existing expandable row for quick preview

## Implementation Steps

### Step 1: Create Order Detail Page
Create `src/pages/events/manage/OrderDetail.tsx`:
- Fetch order by ID with order items
- Fetch attendees for the order using `useOrderAttendees`
- Display order summary, items, and attendees in a clean layout
- Include "Edit Attendees" capability inline

### Step 2: Add Route
Update `src/App.tsx`:
- Add route `/events/manage/orders/:orderId` for the Order Detail page

### Step 3: Update Attendees Table
Modify `src/components/events/AttendeesTable.tsx`:
- Wrap Order # in a `Link` component pointing to `/events/manage/orders/{order_id}`

### Step 4: Update Orders Table
Modify `src/components/events/OrdersTable.tsx`:
- Add "View Details" button in the expanded row that links to Order Detail page

## New Files
- `src/pages/events/manage/OrderDetail.tsx` - Dedicated order detail page with attendees

## Files to Modify
- `src/App.tsx` - Add new route
- `src/components/events/AttendeesTable.tsx` - Make Order # clickable
- `src/components/events/OrdersTable.tsx` - Add View Details link

## Navigation Flow
```text
Attendees Table:
  Order # (clickable) → Order Detail Page

Orders Table:
  Expand row → View Details button → Order Detail Page

Order Detail Page:
  ← Back to Orders
  Shows order info + attendees list
  Edit attendee details inline
```
