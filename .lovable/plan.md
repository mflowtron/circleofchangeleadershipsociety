

# Plan: Make Event Dashboard Tables Mobile-Friendly with Horizontal Scroll

## Problem
Tables in the event management dashboard are stretching past the browser screen on mobile devices. The table content needs to scroll horizontally within its container rather than causing the entire page to overflow.

## Solution Overview
The base `Table` component already includes `overflow-auto` on its wrapper. However, the parent containers wrapping these tables need to be constrained with `overflow-hidden` so the table's internal scroll works properly on mobile.

## Files to Modify

### 1. `src/components/events/OrdersTable.tsx`
- Add `overflow-hidden` to the table container div (line 127)
- This ensures the table scrolls horizontally within its bounds

### 2. `src/components/events/AttendeesTable.tsx`  
- Add `overflow-hidden` to the table container div (line 178)
- Same fix for the attendees table

### 3. `src/pages/events/manage/Index.tsx`
- Add `overflow-hidden` to the events list table container (line 68)
- Ensures the events management table scrolls properly on mobile

### 4. `src/pages/events/manage/ManageTickets.tsx`
- Add `overflow-hidden` to the ticket types table container (line 128)
- Ensures ticket management table scrolls properly on mobile

## Technical Details

Each table wrapper currently looks like:
```tsx
<div className="rounded-lg border">
  <Table>...</Table>
</div>
```

Will be changed to:
```tsx
<div className="rounded-lg border overflow-hidden">
  <Table>...</Table>
</div>
```

The `overflow-hidden` on the parent combined with the existing `overflow-auto` on the Table component's internal wrapper creates the proper scroll containment pattern for mobile.

