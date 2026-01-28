
# Badge Creation System for Event Attendees

## Overview
Build a comprehensive badge generation system that allows event organizers to:
1. Upload a custom badge background/design image
2. Position text fields (attendee name, ticket type, etc.) on the badge using a visual editor
3. Generate a PDF with multiple badges laid out on the AVERY 5392 template (6 badges per page, 3"x4" each)

## AVERY 5392 Template Specifications
- Page size: 8.5" x 11" (Letter)
- 6 badges per page (2 columns x 3 rows)
- Each badge: 3" wide x 4" tall
- Margins: 0.69" top, 0.19" left/right between badges

## Architecture

### New Components
```text
src/components/events/badges/
├── BadgeDesigner.tsx       - Visual editor to position text on badge
├── BadgePreview.tsx        - Live preview of a single badge
├── BadgeFieldEditor.tsx    - Controls for each text field (position, font, size)
├── BadgeTemplateUpload.tsx - Image upload for badge background
└── BadgeGeneratorDialog.tsx - Main dialog to access the badge system
```

### New Pages
```text
src/pages/events/manage/BadgeDesigner.tsx - Full page badge design experience
```

### Data Model
Create a `badge_templates` table to store event-specific badge designs:
- `id` - UUID primary key
- `event_id` - Reference to event
- `background_image_url` - URL to uploaded badge background
- `fields` - JSONB array of field configurations:
  ```json
  [
    {
      "id": "name",
      "label": "Attendee Name", 
      "x": 1.5,
      "y": 0.5,
      "fontSize": 24,
      "fontWeight": "bold",
      "color": "#000000",
      "align": "center",
      "source": "attendee_name"
    },
    {
      "id": "ticketType",
      "label": "Ticket Type",
      "x": 1.5,
      "y": 1.2,
      "fontSize": 14,
      "color": "#666666",
      "align": "center", 
      "source": "ticket_type"
    }
  ]
  ```
- `created_at`, `updated_at` timestamps

### Storage
Create a new `badge-templates` storage bucket for badge background images.

## Implementation Steps

### Step 1: Database Setup
Create migration for:
- `badge_templates` table with RLS policies (admin/event_organizer access)
- `badge-templates` storage bucket with appropriate policies

### Step 2: Badge Template Hooks
Create `src/hooks/useBadgeTemplates.ts`:
- `useBadgeTemplate(eventId)` - Fetch template for an event
- `useCreateBadgeTemplate()` - Create new template
- `useUpdateBadgeTemplate()` - Update template fields/image
- `useUploadBadgeBackground()` - Upload background image to storage

### Step 3: Badge Designer Component
Create visual editor with:
- Drag-and-drop field positioning on badge canvas
- Live preview with sample attendee data
- Field property panel (font size, color, alignment)
- Background image upload with crop/fit options
- Grid/guides toggle for alignment help

### Step 4: PDF Generation Utility
Create `src/lib/badgePdfGenerator.ts`:
- Install `jspdf` package for PDF generation
- Configure AVERY 5392 page layout
- Render badge background image
- Overlay text fields at configured positions
- Handle pagination for multiple attendees

### Step 5: Badge Generation Dialog
Create dialog accessible from Attendees page:
- Select/create badge template
- Preview badges with real attendee data
- Filter which attendees to include (by ticket type, completion status)
- Generate and download PDF

### Step 6: Integration Points
- Add "Print Badges" button to Attendees page header
- Add badge template management to event settings
- Update sidebar with badge designer link when event is selected

## User Flow

```text
1. Event Organizer selects an event
2. Goes to Attendees page or Event Settings
3. Clicks "Print Badges" or "Badge Designer"
4. If no template exists:
   a. Upload badge background image (3"x4" design)
   b. Add/position text fields using drag-and-drop
   c. Configure font styles for each field
   d. Save template
5. If template exists:
   a. Preview badges with attendee data
   b. Optionally edit template
6. Filter attendees (complete only, specific ticket types)
7. Click "Generate PDF"
8. Download PDF ready for AVERY 5392 sheets
```

## Technical Details

### PDF Generation (jsPDF)
```typescript
// AVERY 5392 dimensions in points (72 points per inch)
const PAGE_WIDTH = 612;  // 8.5"
const PAGE_HEIGHT = 792; // 11"
const BADGE_WIDTH = 216; // 3"
const BADGE_HEIGHT = 288; // 4"
const TOP_MARGIN = 50;   // ~0.69"
const LEFT_MARGIN = 54;  // ~0.75"
const H_GAP = 14;        // ~0.19" between columns
const V_GAP = 0;         // No vertical gap

// Layout: 2 columns x 3 rows = 6 badges per page
const COLS = 2;
const ROWS = 3;
```

### Badge Field Sources
Available data fields for badges:
- `attendee_name` - Attendee's name
- `attendee_email` - Attendee's email  
- `ticket_type` - Ticket type name
- `order_number` - Order reference number
- `purchaser_name` - Name of person who purchased
- `event_name` - Event title
- `event_date` - Event start date

### New Files to Create
- `src/components/events/badges/BadgeDesigner.tsx`
- `src/components/events/badges/BadgePreview.tsx`
- `src/components/events/badges/BadgeFieldEditor.tsx`
- `src/components/events/badges/BadgeTemplateUpload.tsx`
- `src/components/events/badges/BadgeGeneratorDialog.tsx`
- `src/hooks/useBadgeTemplates.ts`
- `src/lib/badgePdfGenerator.ts`
- `src/pages/events/manage/BadgeDesigner.tsx`

### Files to Modify
- `src/pages/events/manage/Attendees.tsx` - Add Print Badges button
- `src/components/events/EventsDashboardSidebar.tsx` - Add Badge Designer nav item
- `src/App.tsx` - Add badge designer route

### Dependencies to Install
- `jspdf` - PDF generation library
