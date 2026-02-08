

# Fix Broken Images with Error Handling and Generate Replacement

## Problem
Event cover images are broken throughout the app because the external URL stored in the database (`https://www.firstgencareerconference.com/wp-content/uploads/2024/11/FINAL-23-scaled.jpg`) returns a 404 error. The current components conditionally render images only when the URL exists, but don't handle the case where the URL exists but the image fails to load.

## Solution Overview
1. Create a reusable `EventCoverImage` component with built-in error handling
2. Update all components that display event cover images to use this new component
3. Generate a professional event cover image using AI to replace the broken one
4. Update the database with the new image URL

---

## Technical Details

### 1. Create EventCoverImage Component

Create a new reusable component at `src/components/events/EventCoverImage.tsx` that:
- Accepts `src`, `alt`, `className`, and `aspectRatio` props
- Tracks image loading state with `useState`
- Uses `onError` handler to detect failed image loads
- Falls back to a gradient placeholder with calendar icon when image fails
- Supports both `<img>` tag and CSS background-image patterns

```text
┌─────────────────────────────────────────┐
│         EventCoverImage Component       │
├─────────────────────────────────────────┤
│  Props:                                 │
│  - src: string | null                   │
│  - alt: string                          │
│  - className?: string                   │
│  - variant: 'img' | 'background'        │
│  - aspectRatio?: '16/9' | 'video'       │
│                                         │
│  State:                                 │
│  - hasError: boolean (default false)    │
│  - isLoading: boolean (default true)    │
│                                         │
│  Behavior:                              │
│  - If src is null/undefined OR hasError │
│    → Show gradient fallback with icon   │
│  - On img onError → setHasError(true)   │
│  - On img onLoad → setIsLoading(false)  │
└─────────────────────────────────────────┘
```

### 2. Update EventHome.tsx

Replace the direct `<img>` tag with the new `EventCoverImage` component:

```tsx
// Before (lines 60-68)
{selectedEvent.cover_image_url && (
  <div className="aspect-video w-full overflow-hidden">
    <img src={selectedEvent.cover_image_url} ... />
  </div>
)}

// After
<EventCoverImage
  src={selectedEvent.cover_image_url}
  alt={selectedEvent.title}
  className="aspect-video w-full"
/>
```

### 3. Update EventCard.tsx

Replace the conditional image rendering with the new component:

```tsx
// Before (lines 16-27)
<AspectRatio ratio={16 / 9}>
  {event.cover_image_url ? (
    <img src={event.cover_image_url} ... />
  ) : (
    <div className="w-full h-full bg-muted ...">
      <Calendar ... />
    </div>
  )}
</AspectRatio>

// After
<AspectRatio ratio={16 / 9}>
  <EventCoverImage
    src={event.cover_image_url}
    alt={event.title}
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  />
</AspectRatio>
```

### 4. Update EventHero.tsx

Update the background image pattern to handle errors:

```tsx
// Before (lines 24-31)
{event.cover_image_url ? (
  <div style={{ backgroundImage: `url(${event.cover_image_url})` }} />
) : (
  <div className="bg-gradient-to-br from-secondary to-secondary/80" />
)}

// After - Use EventCoverImage with variant="background"
<EventCoverImage
  src={event.cover_image_url}
  alt={event.title}
  variant="background"
  className="absolute inset-0"
/>
```

### 5. Generate Replacement Event Cover Image

Use AI image generation to create a professional event cover image for the "2026 First Generation Student Career Leadership Experience" event:

**Prompt**: "Professional conference event banner, diverse group of young professionals and students networking at a career leadership event, modern corporate venue, warm lighting, professional photography style, 16:9 aspect ratio, high quality"

The generated image will be:
1. Saved to a Supabase storage bucket
2. Database updated with the new storage URL

### 6. Upload Generated Image to Storage

After generating the image:
- Upload to `event-images` storage bucket
- Update the event's `cover_image_url` in the database

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/events/EventCoverImage.tsx` | CREATE - New reusable component |
| `src/pages/attendee/EventHome.tsx` | MODIFY - Use EventCoverImage |
| `src/components/events/EventCard.tsx` | MODIFY - Use EventCoverImage |
| `src/components/events/EventHero.tsx` | MODIFY - Use EventCoverImage |

## Database Update
After image generation, update the events table:
```sql
UPDATE events 
SET cover_image_url = '[new_storage_url]' 
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
```

