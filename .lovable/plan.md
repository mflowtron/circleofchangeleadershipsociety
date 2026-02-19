

# Make URLs Clickable in Announcement Content

## Overview

Announcement descriptions currently render as plain text. Any URLs typed into the content are not clickable. This change adds a shared utility function to parse text for URLs and render them as clickable links, then applies it across all three announcement display components in the Society (LMS) and Attendee sides.

## Approach

Create a small reusable React component/utility that takes a string, finds URLs via regex, and returns a mix of text spans and `<a>` tags. This avoids pulling in a heavy Markdown library for a simple linkification need.

## Files to Change

### 1. New file: `src/utils/linkifyText.tsx`

A small utility that exports a `LinkifiedText` React component:

- Uses a URL regex to split text into segments
- Renders plain text as-is and URLs as `<a href="..." target="_blank" rel="noopener noreferrer">` links
- Accepts a `className` prop for link styling (e.g., underline, primary color)
- Handles edge cases: URLs at start/end of string, multiple URLs, no URLs

### 2. `src/components/announcements/AnnouncementCard.tsx` (Society home banner)

**Line 47-49**: Replace `{announcement.content}` with `<LinkifiedText text={announcement.content} />` so URLs in the dismissible banner cards are clickable.

### 3. `src/pages/attendee/Announcements.tsx` (Attendee announcements history)

**Line 75-77**: Replace `{announcement.content}` with `<LinkifiedText text={announcement.content} />` so URLs in the full announcement list are clickable.

### 4. `src/components/attendee/feed/cards/AnnouncementCard.tsx` (Attendee feed card)

**Line 74-76**: Replace `{announcement.body}` with `<LinkifiedText text={announcement.body} />` so URLs in feed-style announcement cards are clickable.

## Technical Details

The `LinkifiedText` component will look like:

```tsx
// src/utils/linkifyText.tsx
import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

interface LinkifiedTextProps {
  text: string;
  linkClassName?: string;
}

export function LinkifiedText({ text, linkClassName = "text-primary underline break-all" }: LinkifiedTextProps) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
```

Key details:
- `break-all` prevents long URLs from overflowing card layouts
- `e.stopPropagation()` prevents link clicks from triggering parent card actions (like dismiss)
- `target="_blank"` with `noopener noreferrer` for safe external linking
- The regex resets `lastIndex` between calls since it uses the `g` flag -- using `split` + `test` avoids this issue naturally
- The link color uses `text-primary` to match the brand gold, with an underline for clarity
- The feed announcement card variant will pass a custom `linkClassName` for light-on-dark styling (e.g., `"text-[#a1a1aa] underline break-all"`)

## No database changes required

This is a purely frontend rendering change.
