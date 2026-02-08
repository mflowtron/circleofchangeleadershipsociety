
# Enable Horizontal Scrolling for Event Management Tables

## Problem
Tables in the Event Management section (Orders, Attendees, Events, Tickets) are currently hiding columns on smaller screens using responsive breakpoint classes (`hidden sm:table-cell`, `hidden md:table-cell`, etc.). The user wants all columns to remain visible at all times, with the table scrolling horizontally on mobile instead of hiding data.

## Solution
Update all tables in the Event Management section to:
1. Remove all responsive hiding classes from table columns
2. Add minimum widths to cells to ensure columns don't collapse
3. Remove any data abbreviations on mobile (like single-letter status codes)
4. Enhance the `ResponsiveTable` component for better mobile scrolling UX

---

## Technical Details

### Step 1: Update ResponsiveTable Component
Enhance the wrapper to better handle horizontal scrolling and add a visual scroll indicator.

**File:** `src/components/ui/responsive-table.tsx`

Changes:
- Add a minimum width to the inner container to force horizontal scroll
- Optionally add a subtle shadow indicator when content is scrollable

### Step 2: Update Table Component
Remove the built-in `overflow-auto` wrapper from the Table component since `ResponsiveTable` handles scrolling.

**File:** `src/components/ui/table.tsx`

Changes:
- Remove the outer `<div className="relative w-full overflow-auto">` wrapper OR
- Let the table just render `<table>` directly when used inside `ResponsiveTable`

### Step 3: Update OrdersTable
Remove all responsive hiding classes and abbreviations.

**File:** `src/components/events/OrdersTable.tsx`

Changes:
- Remove `hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell` from all columns
- Remove mobile-only inline displays (e.g., customer name shown inline under order)
- Remove abbreviated status badge text (`sm:hidden` single letter)
- Add `whitespace-nowrap` and `min-w-*` to prevent column collapse
- Keep all data fully visible

### Step 4: Update AttendeesTable
Remove all responsive hiding classes and abbreviations.

**File:** `src/components/events/AttendeesTable.tsx`

Changes:
- Remove `hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell`, `hidden xl:table-cell`, `hidden 2xl:table-cell` from all columns
- Remove mobile-only inline displays for email and ticket type
- Remove abbreviated badge text
- Add `whitespace-nowrap` and minimum widths to cells

### Step 5: Update ManageTickets Table
Remove responsive hiding and inline mobile displays.

**File:** `src/pages/events/manage/ManageTickets.tsx`

Changes:
- Remove `hidden sm:table-cell` from "Sold / Available" column
- Remove mobile-only inline sold count display
- Add minimum widths for consistent layout

### Step 6: Update Manage Events Index Table
Remove responsive hiding and inline mobile displays.

**File:** `src/pages/events/manage/Index.tsx`

Changes:
- Remove `hidden sm:table-cell` from Date column
- Remove mobile-only date display and status abbreviation
- Add minimum widths for consistent layout

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/responsive-table.tsx` | Enhance scroll container with min-width |
| `src/components/ui/table.tsx` | Optionally remove inner overflow wrapper |
| `src/components/events/OrdersTable.tsx` | Remove hidden classes, abbreviations, add min-widths |
| `src/components/events/AttendeesTable.tsx` | Remove hidden classes, abbreviations, add min-widths |
| `src/pages/events/manage/ManageTickets.tsx` | Remove hidden classes, inline mobile data |
| `src/pages/events/manage/Index.tsx` | Remove hidden classes, inline mobile data |

---

## Example Changes

### Before (OrdersTable header)
```tsx
<TableHead className="hidden sm:table-cell">Customer</TableHead>
<TableHead className="hidden lg:table-cell">Tickets</TableHead>
```

### After (OrdersTable header)
```tsx
<TableHead className="whitespace-nowrap">Customer</TableHead>
<TableHead className="whitespace-nowrap">Tickets</TableHead>
```

### Before (Status badge)
```tsx
<Badge>
  <span className="hidden sm:inline">Completed</span>
  <span className="sm:hidden">C</span>
</Badge>
```

### After (Status badge)
```tsx
<Badge>Completed</Badge>
```

---

## Outcome
- All table columns remain visible on all screen sizes
- Tables scroll horizontally on mobile with smooth touch scrolling
- No data is abbreviated or hidden based on screen size
- Consistent data presentation across all devices
