
# Plan: Mobile Responsiveness Audit and Fixes (320px+)

## Overview

This plan addresses mobile responsiveness issues across the entire application, ensuring the design works properly on screens as narrow as 320px (iPhone SE/5 size). The audit has identified several categories of issues that need fixing.

---

## Issues Identified

### 1. Tables Overflow on Small Screens
Multiple pages use tables that don't adapt well to narrow screens:
- **Users.tsx** - User management tables with 4-5 columns
- **LMSEvents.tsx** - Events management table
- **OrdersTable.tsx** - Orders table with 6-7 columns
- **AttendeesTable.tsx** - Attendees table with 7-8 columns
- **ManageTickets.tsx** - Ticket types table
- **ManageEventsIndex.tsx** - Events listing table
- **OrderDetail.tsx** - Attendees table within order

### 2. Header/Button Row Overflow
Several pages have header sections with buttons that overflow on narrow screens:
- **Recordings.tsx** - "Reorder" and "Upload Recording" buttons
- **Attendees.tsx** - "Print Badges" and "Export CSV" buttons
- **ManageTickets.tsx** - Header with back button and "Add Ticket Type"
- **RecordingPlayerView.tsx** - Back button and "Generate Captions" button

### 3. Filter/Search Sections Need Stacking
Filter sections with multiple controls need better mobile stacking:
- **OrdersTable.tsx** - Search + status filter
- **AttendeesTable.tsx** - Search + ticket filter + status filter + export button

### 4. Grid Layouts at 320px
Some grid layouts may cause items to be too narrow:
- **DashboardSelector.tsx** - 2-column grid on md+ is fine, but cards could use more breathing room
- **RecordingsBrowseView.tsx** - Grid is already responsive

### 5. Long Text Overflow
Some text elements may overflow:
- Order numbers (monospace font)
- Email addresses
- Event names in tables

### 6. Tab Triggers Too Wide
- **LMSEvents.tsx** - "Manage Events" tab text may overflow
- **RecordingPlayerView.tsx** - Tab triggers with icons + text

---

## Implementation Steps

### Step 1: Create Responsive Table Wrapper Component

Create a reusable component for horizontal-scrolling tables on mobile:

**File:** `src/components/ui/responsive-table.tsx`

```typescript
// Wrapper that enables horizontal scroll for tables on mobile
// while maintaining internal scroll behavior
```

This component will:
- Add horizontal scroll with `-webkit-overflow-scrolling: touch`
- Show scroll indicator shadow on the right when content is clipped
- Maintain minimum width for table readability

---

### Step 2: Fix Users.tsx Mobile Layout

**Changes:**
- Wrap tables in responsive table component
- Stack filter tabs vertically on mobile
- Convert pending approvals table to card-based layout on mobile
- Reduce padding in table cells on mobile

**Mobile Card Layout for Pending Users:**
```
┌────────────────────────────────┐
│ [Avatar] Name                  │
│          Badge: Pending        │
│ ──────────────────────────────│
│ Role: [Select Dropdown]       │
│ Chapter: [Select Dropdown]    │
│           [Approve Button]    │
└────────────────────────────────┘
```

---

### Step 3: Fix LMSEvents.tsx Mobile Layout

**Changes:**
- Convert manage events table to stacked cards on mobile (< 640px)
- Shorten tab text on mobile: "Upcoming" / "Manage"
- Stack date/time inputs in event form dialog on mobile
- Ensure action buttons wrap properly

---

### Step 4: Fix Orders and Attendees Tables

**OrdersTable.tsx Changes:**
- Add responsive table wrapper
- Make search input full width on mobile
- Stack filters vertically
- Hide less critical columns on mobile (use CSS `hidden sm:table-cell`)
- Show key info in expandable row

**AttendeesTable.tsx Changes:**
- Same responsive wrapper approach
- Stack all filters vertically on mobile
- Hide Event, Order #, Purchaser columns on mobile
- Show essential info inline in remaining cells

---

### Step 5: Fix Header Button Rows

**Recordings.tsx:**
```tsx
// Change from:
<div className="flex items-center gap-2">

// To:
<div className="flex flex-wrap items-center gap-2">
```

Also, hide button text on mobile, show only icons:
```tsx
<Button>
  <ArrowUpDown className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">Reorder</span>
</Button>
```

**Apply similar pattern to:**
- Attendees.tsx
- ManageTickets.tsx
- RecordingPlayerView.tsx

---

### Step 6: Fix Tab Triggers Width

**RecordingPlayerView.tsx:**
- Use shorter labels on mobile
- Hide "(unavailable)" text on mobile
- Stack icons above text if needed

```tsx
<TabsTrigger value="transcript" className="gap-1 sm:gap-2">
  <FileText className="h-4 w-4" />
  <span className="hidden xs:inline">Transcript</span>
</TabsTrigger>
```

---

### Step 7: Add Text Truncation Utilities

Ensure long text doesn't break layouts:

**For order numbers:**
```tsx
<span className="font-mono text-sm truncate max-w-[100px] sm:max-w-none">
  {order.order_number}
</span>
```

**For emails:**
```tsx
<span className="truncate max-w-[150px] sm:max-w-none">
  {order.email}
</span>
```

---

### Step 8: Fix Moderation.tsx Delete Button

The delete button sits beside the post content. On mobile, it should be moved:

```tsx
// Wrap content with flex-col on mobile
<div className="flex flex-col sm:flex-row items-start justify-between gap-3">
  <div className="flex items-start gap-3 flex-1 min-w-0">
    {/* Avatar and content */}
  </div>
  <Button variant="destructive" size="sm" className="w-full sm:w-auto">
    <Trash2 className="h-4 w-4 mr-2" />
    Delete
  </Button>
</div>
```

---

### Step 9: Fix Announcement Cards Action Buttons

**Announcements.tsx:**
```tsx
// Current: buttons inline with content
// Fix: Stack on mobile
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2">
```

---

### Step 10: Add Custom 320px Breakpoint (Optional)

Add an `xs` breakpoint to Tailwind for 320px-specific styles:

**tailwind.config.ts:**
```typescript
theme: {
  screens: {
    'xs': '320px',
    'sm': '640px',
    // ... existing breakpoints
  }
}
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ui/responsive-table.tsx` | New | Reusable horizontal scroll wrapper for tables |
| `src/pages/Users.tsx` | Modify | Add mobile card layout for pending users, wrap tables |
| `src/pages/LMSEvents.tsx` | Modify | Convert table to cards on mobile, shorten tabs |
| `src/pages/Moderation.tsx` | Modify | Stack delete button below content on mobile |
| `src/pages/Announcements.tsx` | Modify | Stack action buttons on mobile |
| `src/pages/Recordings.tsx` | Modify | Wrap buttons, use icon-only on mobile |
| `src/pages/events/manage/Attendees.tsx` | Modify | Stack filter buttons, wrap header |
| `src/pages/events/manage/ManageTickets.tsx` | Modify | Wrap header, responsive table |
| `src/pages/events/manage/Index.tsx` | Modify | Responsive table, hide columns on mobile |
| `src/pages/events/manage/Orders.tsx` | Modify | Stack header elements |
| `src/pages/events/manage/OrderDetail.tsx` | Modify | Responsive attendee table, stack sections |
| `src/components/events/OrdersTable.tsx` | Modify | Add responsive wrapper, hide columns, stack filters |
| `src/components/events/AttendeesTable.tsx` | Modify | Same responsive improvements |
| `src/components/recordings/RecordingPlayerView.tsx` | Modify | Wrap header buttons, shorter tab labels |
| `src/components/recordings/RecordingsBrowseView.tsx` | Modify | Ensure grid is 1-column at 320px |
| `tailwind.config.ts` | Modify | Add `xs: 320px` breakpoint |

---

## Testing Checklist

After implementation, verify each page at 320px viewport:

- [ ] Auth page - Login/signup forms
- [ ] Feed page - Post cards, tabs, create form
- [ ] Recordings page - Grid, reorder mode, upload dialog
- [ ] Recording player - Video, tabs, transcript
- [ ] Profile page - Avatar, form fields
- [ ] Users page - Tabs, approval table, user list
- [ ] Chapters page - Table, dialog forms
- [ ] Moderation page - Post cards with delete
- [ ] MyChapter page - Grid layout, member list
- [ ] Announcements page - Cards with action buttons
- [ ] LMSEvents page - Event cards, management table
- [ ] DashboardSelector - Two-column cards
- [ ] PendingApproval - Centered card
- [ ] Events Index (public) - Event cards grid
- [ ] Event Detail - Sidebar layout, ticket section
- [ ] Checkout - Form fields, ticket selector
- [ ] Checkout Success - Order details
- [ ] Order Attendees - Attendee forms
- [ ] Events Manage Index - Events table
- [ ] New/Edit Event - Form fields
- [ ] Manage Tickets - Ticket types table
- [ ] Orders management - Orders table with filters
- [ ] Attendees management - Attendees table with filters
- [ ] Order Detail - Customer info, attendees, messages
- [ ] Order Portal Index - OTP input
- [ ] Order Portal Dashboard - Order cards

---

## Key Responsive Patterns to Apply

1. **Tables**: Horizontal scroll wrapper + hide non-essential columns
2. **Button groups**: `flex-wrap` + icon-only on mobile
3. **Filter rows**: Stack vertically with `flex-col sm:flex-row`
4. **Card actions**: Move to bottom on mobile
5. **Long text**: `truncate` with max-width constraints
6. **Grids**: Ensure single column at 320px
7. **Dialogs**: Full width inputs, stacked date pickers

---

## Technical Notes

- All changes use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)
- No JavaScript media queries needed - CSS-only approach
- Existing `min-w-0` pattern in layouts prevents flex overflow
- iOS safe areas are already handled via `env(safe-area-inset-*)`
- Touch-friendly tap targets (44px min) are enforced in index.css
