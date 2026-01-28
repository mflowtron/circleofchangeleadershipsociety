
# Announcements Feature

## Overview

This feature will allow admins to create announcements that are displayed prominently to all users. Announcements will appear in a dedicated banner at the top of the Feed page, providing high visibility for important messages.

## User Experience

### For All Users
- A prominent announcement banner appears at the top of the Feed, above all posts
- Active announcements display with a distinctive golden/primary color scheme matching the app's premium aesthetic
- Users can dismiss announcements individually (the dismissal is remembered)
- Multiple active announcements will be shown in a carousel/stack format

### For Admins
- A new "Announcements" navigation item in the sidebar
- A dedicated management page to create, edit, and delete announcements
- Options to set an expiration date for time-limited announcements
- Ability to mark announcements as active/inactive

## Visual Design

The announcement banner will feature:
- A distinctive card with golden accent border and subtle gradient background
- A megaphone icon to draw attention
- The announcement title in bold with content below
- A dismiss button for users
- Smooth slide-in animation when appearing

## Technical Implementation

### 1. Database Schema

Create an `announcements` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Announcement title |
| content | text | Main announcement content |
| is_active | boolean | Whether the announcement is currently displayed |
| expires_at | timestamp | Optional expiration date |
| created_at | timestamp | Creation timestamp |
| created_by | uuid | Admin user who created it |

Create a `dismissed_announcements` table to track user dismissals:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User who dismissed |
| announcement_id | uuid | The dismissed announcement |
| dismissed_at | timestamp | When it was dismissed |

### 2. Row-Level Security Policies

**announcements table:**
- SELECT: All authenticated users can view active announcements
- INSERT/UPDATE/DELETE: Only admins

**dismissed_announcements table:**
- SELECT: Users can view their own dismissals
- INSERT: Users can dismiss announcements for themselves
- DELETE: Users can un-dismiss if needed

### 3. New Files

| File | Purpose |
|------|---------|
| `src/components/announcements/AnnouncementBanner.tsx` | Displays announcements at top of Feed |
| `src/components/announcements/AnnouncementCard.tsx` | Individual announcement card component |
| `src/components/announcements/CreateAnnouncementForm.tsx` | Form for admins to create announcements |
| `src/hooks/useAnnouncements.ts` | Hook for fetching and managing announcements |
| `src/pages/Announcements.tsx` | Admin page for managing announcements |

### 4. File Modifications

| File | Changes |
|------|---------|
| `src/components/layout/Sidebar.tsx` | Add "Announcements" nav item for admins |
| `src/pages/Feed.tsx` | Add AnnouncementBanner component above posts |
| `src/App.tsx` | Add route for /announcements (admin only) |

### 5. Implementation Flow

```text
+------------------+      +-------------------+      +------------------+
| Admin creates    | ---> | Announcement      | ---> | Users see        |
| announcement     |      | saved to database |      | banner in Feed   |
+------------------+      +-------------------+      +------------------+
                                                            |
                                                            v
                                                     +------------------+
                                                     | User dismisses   |
                                                     | (saved in DB)    |
                                                     +------------------+
```

### 6. Component Architecture

**AnnouncementBanner** (Container):
- Fetches active, non-dismissed announcements
- Renders AnnouncementCard for each
- Handles dismiss action

**AnnouncementCard** (Presentational):
- Displays individual announcement with premium styling
- Golden border, glassmorphism effect
- Megaphone icon, title, content, dismiss button

**CreateAnnouncementForm**:
- Title input (required)
- Content textarea (required)
- Optional expiration date picker
- Active toggle switch

### 7. Hook: useAnnouncements

```text
Returns:
- announcements: Active announcements not dismissed by user
- allAnnouncements: All announcements (for admin view)
- loading: Loading state
- createAnnouncement(data): Create new announcement
- updateAnnouncement(id, data): Update existing
- deleteAnnouncement(id): Delete announcement
- dismissAnnouncement(id): Dismiss for current user
```

## Summary

This implementation provides a complete announcements system with:
- Prominent display in the Feed for maximum visibility
- Per-user dismissal tracking so announcements don't become annoying
- Optional expiration for time-sensitive content
- Full admin CRUD capabilities
- Premium design matching the app's golden aesthetic
