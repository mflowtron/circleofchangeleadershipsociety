

# Add Admin Interface to Manage Hotels for Events

## Overview

Create a full CRUD admin interface for managing hotel options per event, following the existing patterns used for Speakers management. This will include a new page, form component, card component, and an enhanced hook with mutation capabilities.

## Implementation Approach

The implementation will follow the exact same patterns established in the Speakers management feature:
- Page component with grid layout and empty state
- Form dialog for add/edit operations
- Card component with dropdown menu actions
- Enhanced hook with React Query mutations
- Route registration and sidebar navigation

---

## Architecture

```text
+------------------------------------------------------------------+
|  /events/manage/hotels                                            |
+------------------------------------------------------------------+
|                                                                   |
|  Header: "Hotels" + "X hotels added" + [Add Hotel] button        |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------------+  +-------------------------+         |
|  |  [Hotel Image]          |  |  [Hotel Image]          |         |
|  |  **Courtyard Marriott** |  |  **Hampton Inn**        |         |
|  |  2825 NE 191st Street   |  |  1000 S Federal Hwy     |  [...]  |
|  |  $239/night             |  |  $199/night             |         |
|  |  [Edit] [Delete]        |  |  [Edit] [Delete]        |         |
|  +-------------------------+  +-------------------------+         |
|                                                                   |
+------------------------------------------------------------------+

Form Dialog:
+------------------------------------------------------------------+
|  Add/Edit Hotel                                            [X]   |
+------------------------------------------------------------------+
|  [Image Upload]                                                   |
|                                                                   |
|  Hotel Name *          [________________________]                 |
|  Address *             [________________________]                 |
|  Phone                 [________________________]                 |
|  Description           [________________________]                 |
|                        [________________________]                 |
|  Rate Description      [________________________]                 |
|  Booking URL           [________________________]                 |
|                                                                   |
|                              [Cancel]  [Save Hotel]               |
+------------------------------------------------------------------+
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/pages/events/manage/Hotels.tsx` | Main hotels management page |
| `src/components/events/hotels/HotelCard.tsx` | Hotel card with edit/delete actions |
| `src/components/events/hotels/HotelForm.tsx` | Dialog form for add/edit hotel |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useEventHotels.ts` | Add mutation functions (create, update, delete) |
| `src/components/events/EventsDashboardSidebar.tsx` | Add "Hotels" nav item |
| `src/App.tsx` | Add route for `/events/manage/hotels` |

---

## Detailed Implementation

### 1. Enhanced useEventHotels Hook

Extend the existing hook with CRUD mutations:

```typescript
// Types
export type HotelInsert = Omit<EventHotel, 'id' | 'created_at'>;
export type HotelUpdate = Partial<Omit<EventHotel, 'id' | 'event_id' | 'created_at'>>;

// New mutations
- createHotel: Insert new hotel record
- updateHotel: Update existing hotel by ID
- deleteHotel: Delete hotel by ID
- uploadImage: Upload hotel image to storage bucket
```

### 2. HotelCard Component

Display hotel information in a card format with:
- Hotel image (or placeholder)
- Hotel name
- Address
- Phone number (if available)
- Rate description
- Booking URL link
- Dropdown menu with Edit/Delete actions

### 3. HotelForm Component

Dialog form with fields:
- Image upload with preview
- Name (required)
- Address (required)
- Phone (optional)
- Description (optional, textarea)
- Rate Description (optional, e.g., "$199/night")
- Booking URL (optional, validated as URL)

Uses react-hook-form with zod validation.

### 4. Hotels Page

Main management page with:
- Header with title and "Add Hotel" button
- Empty state when no hotels exist
- Grid of HotelCard components
- SpeakerForm-style dialog for add/edit
- Delete confirmation dialog

### 5. Navigation & Routing

Add to sidebar navigation:
```typescript
{ path: '/events/manage/hotels', label: 'Hotels', icon: Building2 }
```

Add protected route:
```typescript
<Route path="/events/manage/hotels" element={...} />
```

---

## Component Details

### HotelCard Layout

```text
+-----------------------------------------------+
|  [Image Placeholder / Hotel Image]            |
|                                               |
|  **Hotel Name**                      [...]    |
|  123 Main Street, City, State 12345           |
|  Phone: 555-123-4567                          |
|                                               |
|  Description text truncated to 2 lines...     |
|                                               |
|  **$199.00/night**                            |
|  [Reserve Now ->]  (if booking_url exists)    |
+-----------------------------------------------+
```

### Form Validation Schema

```typescript
const hotelSchema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional(),
  description: z.string().optional(),
  rate_description: z.string().optional(),
  booking_url: z.string().url().optional().or(z.literal('')),
});
```

---

## Database Considerations

No schema changes needed - the `event_hotels` table already exists with all required columns:
- id, event_id, name, address, phone, description
- image_url, rate_description, booking_url, sort_order, created_at

RLS policies are already in place:
- Public read access
- Event owner and admins can insert/update/delete

---

## Image Storage

Hotel images will be stored in the existing `event-images` bucket:
- Path: `hotels/{eventId}/{hotelId}.{ext}`
- Same pattern used for speaker photos

---

## Implementation Order

1. **Enhance Hook** - Add mutations to `useEventHotels.ts`
2. **Create HotelCard** - Reusable card component
3. **Create HotelForm** - Dialog form for CRUD
4. **Create Hotels Page** - Main management interface
5. **Add Navigation** - Sidebar link and route

