

# Fix Text Overlapping in Agenda Calendar Items

## Problem

In the agenda calendar view, text within agenda items is overlapping. For example, "Workshop: Mental Health & Wellness" appears as "Workshop: MentaSkull" with "th & Wellness" wrapping below and overlapping with the time text.

## Root Cause

The inner text container has `overflow-hidden` and `truncate` classes, but the overall flex container doesn't properly constrain its height. When the item height is small, the title text wraps instead of truncating, causing it to overlap with the time text below.

The current structure:
```
button (overflow-hidden, fixed height)
  div.flex (h-full, but no overflow control)
    div (min-w-0, flex-1, overflow-hidden)
      p.truncate (title)
      p.truncate (time)
```

The `truncate` class should prevent wrapping, but the parent container's flex layout allows content to overflow.

## Solution

1. Add `overflow-hidden` to the inner flex container to ensure content respects boundaries
2. Add explicit height constraints to the text container
3. Ensure the title paragraph uses `line-clamp-1` instead of just `truncate` for more reliable single-line behavior
4. Add `flex-col` and `overflow-hidden` to the text wrapper to properly stack and clip content

## Implementation Details

### File: `src/components/events/agenda/AgendaCalendarItem.tsx`

**Change 1**: Update the main flex container (line 87)

```typescript
// Before
<div className="flex items-start gap-1 h-full">

// After
<div className="flex items-start gap-1 h-full overflow-hidden">
```

**Change 2**: Update the text container to properly clip content (line 91)

```typescript
// Before
<div className="min-w-0 flex-1 overflow-hidden">

// After
<div className="min-w-0 flex-1 overflow-hidden flex flex-col">
```

**Change 3**: Ensure title uses `line-clamp-1` for reliable single-line display (lines 92-96)

```typescript
// Before
<p className={cn(
  'font-medium truncate',
  isCompact ? 'text-xs' : 'text-sm'
)}>
  {item.title}
</p>

// After
<p className={cn(
  'font-medium truncate line-clamp-1',
  isCompact ? 'text-xs' : 'text-sm'
)}>
  {item.title}
</p>
```

**Change 4**: Ensure time text also clips properly (lines 98-101)

```typescript
// Before
{!isCompact && (
  <p className="text-xs text-muted-foreground truncate">
    {format(itemStart, 'h:mm a')} - {format(itemEnd, 'h:mm a')}
  </p>
)}

// After
{!isCompact && (
  <p className="text-xs text-muted-foreground truncate line-clamp-1 flex-shrink-0">
    {format(itemStart, 'h:mm a')} - {format(itemEnd, 'h:mm a')}
  </p>
)}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/agenda/AgendaCalendarItem.tsx` | Add overflow controls and line-clamp to prevent text wrapping/overlapping |

## Technical Details

- `line-clamp-1`: Forces text to a single line with ellipsis truncation (more reliable than `truncate` alone)
- `overflow-hidden` on flex container: Ensures child content respects the container boundaries
- `flex-shrink-0` on time text: Prevents the time from being compressed, prioritizing title truncation

## Testing Checklist

After implementation, verify:
- Long session titles truncate with ellipsis instead of wrapping
- Time text stays on its own line, not overlapping with title
- Compact items (2 rows or less) still show only the title properly
- All agenda item types display correctly without text overlap

