
# Add Scroll Indicators and Top Scrollbar to ResponsiveTable

## Overview
Enhance the `ResponsiveTable` component with visual scroll indicators (shadows) that appear when there's more content to scroll, and add a synchronized horizontal scrollbar at the top of the table for easier mouse navigation.

---

## Changes

### Update ResponsiveTable Component
**File:** `src/components/ui/responsive-table.tsx`

Add the following features:

1. **State tracking for scroll position** - Track whether the user can scroll left, right, or both directions

2. **Scroll indicator shadows** - Show subtle gradient shadows on the left/right edges when there's more content in that direction

3. **Top scrollbar** - Add a hidden div at the top that contains a scrollbar, synchronized with the main content scroll

---

## Technical Implementation

### Component Structure
```text
┌─────────────────────────────────────────┐
│  Top Scrollbar (thin, synced)           │
├─────────────────────────────────────────┤
│ ░│                              │░      │
│ ░│      Table Content           │░      │
│ ░│                              │░      │
│  │  ← Shadow when scrollable →  │       │
└─────────────────────────────────────────┘
```

### Key Implementation Details

1. **Refs for synchronized scrolling**
   - `topScrollbarRef` - Reference to the top scrollbar container
   - `contentRef` - Reference to the main content container
   - `innerRef` - Reference to the inner content to measure actual width

2. **Scroll state tracking**
   - `canScrollLeft` - Boolean indicating content exists to the left
   - `canScrollRight` - Boolean indicating content exists to the right
   - Updated on scroll and resize events

3. **Synchronized scroll handler**
   - When top scrollbar scrolls, update content scrollLeft
   - When content scrolls, update top scrollbar scrollLeft
   - Use a flag to prevent infinite scroll loops

4. **Shadow indicators**
   - Left shadow: `bg-gradient-to-r from-black/10 to-transparent` (visible when `canScrollLeft`)
   - Right shadow: `bg-gradient-to-l from-black/10 to-transparent` (visible when `canScrollRight`)
   - Positioned absolutely over the edges

5. **Top scrollbar styling**
   - Height of approximately 12-16px
   - Contains an inner div that matches the content width
   - Standard browser scrollbar appearance

6. **ResizeObserver**
   - Monitor content width changes to update scroll state
   - Ensure top scrollbar width stays in sync with content

### Pseudo-code
```tsx
export function ResponsiveTable({ children, className, ...props }) {
  const topScrollbarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  
  // Check scroll position and update state
  const updateScrollState = useCallback(() => {
    if (!contentRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = contentRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);
  
  // Sync scroll between top bar and content
  const handleTopScroll = () => {
    if (contentRef.current && topScrollbarRef.current) {
      contentRef.current.scrollLeft = topScrollbarRef.current.scrollLeft;
    }
  };
  
  const handleContentScroll = () => {
    if (contentRef.current && topScrollbarRef.current) {
      topScrollbarRef.current.scrollLeft = contentRef.current.scrollLeft;
    }
    updateScrollState();
  };
  
  // ResizeObserver for content width changes
  useEffect(() => {
    // Set up ResizeObserver on innerRef
    // Update contentWidth state when size changes
  }, []);
  
  return (
    <div className="relative">
      {/* Top scrollbar */}
      <div 
        ref={topScrollbarRef}
        className="overflow-x-auto overflow-y-hidden h-3"
        onScroll={handleTopScroll}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      
      {/* Main content with shadows */}
      <div className="relative">
        {/* Left shadow */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-4 
            bg-gradient-to-r from-black/10 to-transparent 
            pointer-events-none z-10" />
        )}
        
        {/* Scrollable content */}
        <div
          ref={contentRef}
          className="overflow-x-auto"
          onScroll={handleContentScroll}
        >
          <div ref={innerRef} className="min-w-max">
            {children}
          </div>
        </div>
        
        {/* Right shadow */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-4 
            bg-gradient-to-l from-black/10 to-transparent 
            pointer-events-none z-10" />
        )}
      </div>
    </div>
  );
}
```

---

## Visual Behavior

| State | Left Shadow | Right Shadow | Top Scrollbar |
|-------|-------------|--------------|---------------|
| At start (scrollLeft = 0) | Hidden | Visible | Synced |
| In middle | Visible | Visible | Synced |
| At end | Visible | Hidden | Synced |
| No overflow (fits viewport) | Hidden | Hidden | Hidden |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/responsive-table.tsx` | Complete rewrite with scroll sync, shadows, and top scrollbar |

---

## Outcome
- Users see subtle shadow indicators when there's more content to scroll horizontally
- Mouse users can use the top scrollbar for convenient scrolling without reaching the bottom
- Touch users continue to scroll naturally within the content area
- Top scrollbar automatically hides when content fits without overflow
