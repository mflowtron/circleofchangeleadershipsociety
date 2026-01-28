
# Order Management Portal

## Overview
Create a self-service portal where ticket purchasers can manage their orders using email-based OTP authentication. The portal will allow viewing order status, managing attendees, purchasing additional tickets, and receiving admin messages.

## User Flow

```text
+------------------+     +------------------+     +------------------+
|  Email Entry     | --> |  OTP Code Sent   | --> |  Verify Code     |
|  (Public Page)   |     |  (Edge Function) |     |  (Edge Function) |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                         +----------------------------------+
                         |     Order Management Portal      |
                         |----------------------------------|
                         | - View Order Details & Status    |
                         | - See/Edit Attendee Information  |
                         | - View Admin Messages            |
                         | - Purchase Additional Tickets    |
                         +----------------------------------+
```

## Features

### 1. Email + OTP Authentication
- User enters the email they used to purchase tickets
- System sends a 6-digit OTP code valid for 10 minutes
- After verification, user gets access to all orders tied to that email
- Codes are single-use and expire after verification

### 2. Order Dashboard
- List all orders associated with the email
- Show order status (completed, pending, cancelled, refunded)
- Display ticket types and quantities
- Show attendee completion progress (e.g., "3/5 attendees registered")

### 3. Attendee Management
- View all attendees across orders
- Edit attendee names and emails inline
- Visual indicators for incomplete registrations

### 4. Admin Messaging
- Display messages from event organizers chronologically
- Support for important announcements (highlighted)
- Read receipts tracking

### 5. Add More Tickets (Future Enhancement)
- Select additional ticket types from original event
- Seamless Stripe checkout integration
- Links new order to same email for unified management

---

## Technical Implementation

### Database Changes

**New Table: `order_access_codes`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email | text | Email address |
| code | text | 6-digit OTP code |
| expires_at | timestamptz | Expiration time (10 min) |
| used_at | timestamptz | When code was verified |
| created_at | timestamptz | Creation time |

**New Table: `order_messages`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_id | uuid | FK to orders |
| message | text | Message content |
| is_important | boolean | Highlighted message |
| created_by | uuid | Admin user who sent |
| read_at | timestamptz | When purchaser read |
| created_at | timestamptz | Creation time |

### RLS Policies

**order_access_codes**
- SELECT: Service role only (via edge functions)
- INSERT: Service role only
- UPDATE: Service role only
- DELETE: Service role only

**order_messages**
- SELECT: Order owner (verified via edge function session) OR admin/event_organizer
- INSERT: Admin or event organizer only
- UPDATE: Message author only (for corrections)

### Edge Functions

**1. `send-order-access-code`**
- Accepts: `{ email: string }`
- Validates email exists in orders table
- Generates 6-digit random code
- Stores in `order_access_codes` with 10-min expiry
- Sends email via Resend (uses existing secret if available)
- Returns: `{ success: true }`

**2. `verify-order-access-code`**
- Accepts: `{ email: string, code: string }`
- Validates code matches, not expired, not used
- Marks code as used
- Returns: `{ valid: true, session_token: uuid }` (session token stored in localStorage)

**3. `get-orders-by-email`**
- Accepts: `{ email: string, session_token: uuid }`
- Validates session token
- Returns all orders + attendees + messages for that email

**4. `add-order-message`** (Admin endpoint)
- Accepts: `{ order_id: uuid, message: string, is_important: boolean }`
- Requires admin/event_organizer authentication
- Creates message record
- Returns the created message

### Frontend Pages

**1. `/my-orders` - Order Portal Entry**
- Email input form
- "Send Access Code" button
- OTP input (6 boxes using existing InputOTP component)
- "Verify" button

**2. `/my-orders/dashboard` - Order Dashboard (after verification)**
- Header with email and "Sign Out" button
- List of orders as cards showing:
  - Order number, date, event name
  - Status badge
  - Ticket summary
  - Attendee progress bar
  - Admin messages (if any, with badge count)
- Click order to expand/see details

### File Structure

```text
src/pages/orders/
  ├── Index.tsx           (Email entry + OTP verification)
  └── Dashboard.tsx       (Order management after auth)

src/hooks/
  └── useOrderPortal.ts   (Custom hook for portal state)

src/components/orders/
  ├── OrderCard.tsx       (Individual order display)
  ├── AttendeeList.tsx    (Editable attendee list)
  └── MessageList.tsx     (Admin messages display)

supabase/functions/
  ├── send-order-access-code/index.ts
  ├── verify-order-access-code/index.ts
  ├── get-orders-by-email/index.ts
  └── add-order-message/index.ts
```

### Admin Interface Updates

Update the existing OrderDetail page (`src/pages/events/manage/OrderDetail.tsx`) to include:
- "Send Message" button
- Message composer with "Mark as Important" checkbox
- List of sent messages with read status

---

## Implementation Phases

### Phase 1: Database & Edge Functions
1. Create `order_access_codes` and `order_messages` tables
2. Implement `send-order-access-code` edge function
3. Implement `verify-order-access-code` edge function
4. Implement `get-orders-by-email` edge function

### Phase 2: Public Portal
1. Create email entry page with OTP flow
2. Build order dashboard with order cards
3. Integrate existing attendee editing functionality
4. Add message display component

### Phase 3: Admin Messaging
1. Add message composer to OrderDetail page
2. Implement `add-order-message` edge function
3. Show read status in admin view

### Phase 4: Additional Tickets (Optional)
1. Add "Buy More Tickets" button to order card
2. Link to checkout with pre-filled email
3. Associate new order with same purchaser

---

## Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/my-orders` | Order Portal Entry | No |
| `/my-orders/dashboard` | Order Dashboard | OTP Session |

---

## Security Considerations

1. **Rate Limiting**: Limit OTP requests to 3 per email per hour
2. **Code Expiry**: 10-minute window prevents brute force
3. **Single Use**: Codes invalidated after verification
4. **Session Tokens**: UUID tokens stored securely, checked on each request
5. **No PII Exposure**: Email verification required before showing any order data
