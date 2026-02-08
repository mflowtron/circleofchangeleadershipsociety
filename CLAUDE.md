# Circle of Change Leadership Society -- Project Instructions

## Project Overview

This is the **Circle of Change Leadership Society** platform -- a "mega-app" combining a Learning Management System (LMS) with full event/conference management. The platform serves a leadership society that hosts conferences and provides ongoing learning experiences through video content, social features, and community engagement.

### Core Capabilities

- **Conference & Event Management**: Registration, scheduling, agenda management, QR code check-ins, name badge printing
- **Learning Management System (LMS)**: Video courses, progress tracking, certifications
- **Social & Community**: Posts, feeds, networking, attendee profiles
- **Administration**: Dashboard analytics, user management, content management

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript 5
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS 3 with CSS custom properties (HSL-based design tokens in `src/index.css`)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions + Storage)
- **State Management**: React Context API + TanStack React Query 5
- **Video**: Mux (streaming and uploads via `@mux/mux-player-react` and `@mux/mux-uploader-react`)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM v6
- **PWA**: vite-plugin-pwa (service worker, offline support)
- **Mobile Wrapper**: Natively (React Native compatibility layer)
- **PDF Generation**: jsPDF (client-side, browser-based)
- **QR Codes**: qrcode.react (generation) + html5-qrcode (scanning)
- **Icons**: Lucide React (primary icon set)
- **Toasts**: Sonner

## Common Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint
npm run test       # Run tests (vitest)
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
src/
  components/         # React components organized by feature domain
    announcements/    # Event announcements UI
    attendee/         # Attendee-facing components
    events/           # Event management components
    feed/             # Social feed components
    layout/           # Layout wrapper components
    moderation/       # Content moderation UI
    orders/           # Order/ticketing components
    pwa/              # Progressive Web App components
    recordings/       # Video recording components
    ui/               # Base shadcn/ui design system components
  pages/              # Route-level page components
    attendee/         # Attendee-facing pages
    events/           # Event management pages
    orders/           # Order management pages
  contexts/           # React Context providers (auth, attendee, bookmarks, messaging, sidebar)
  hooks/              # Custom React hooks -- ALL data fetching goes here
  integrations/       # External service clients
    supabase/         # Supabase client init + auto-generated types
  layouts/            # Page layout components
  lib/                # Utility libraries (PDF generators, calendar utils, timezone utils)
  types/              # TypeScript interfaces and type definitions
  utils/              # Pure utility functions
  data/               # Static/demo data
  test/               # Test files
  assets/             # Static images (events, feed, hotels, speakers)

supabase/
  functions/          # 20+ Supabase Edge Functions (chat, payments, notifications, moderation)

docs/
  DATA_DICTIONARY.md  # Comprehensive database schema (30 tables, 12 functions, 6 storage buckets)
```

Path alias: `@/` maps to `./src/*`

## Brand & Design System

### Color Palette

- **Primary Gold**: `hsl(42 75% 50%)` -- CSS var `--primary`
- **Hex equivalents**: Light mode gold `#DFA51F`, Dark mode orange `#F58300`
- **Burgundy-to-Black Gradients**: Used for hero sections, headers, premium UI elements
- **All colors are defined as HSL CSS custom properties** in `src/index.css` -- never hardcode hex colors
- Do NOT introduce new brand colors without explicit approval

### Typography

- **Display / Headings**: `Playfair Display` -- titles, hero text, section headers
- **Body / Elegant Text**: `Cormorant Garamond` -- subheadings, quotes, elegant body text
- **UI / System Text**: `Inter` (default sans-serif stack) -- buttons, labels, form fields, navigation, small UI text
- Font stack is configured in `tailwind.config.ts`

### Design Principles

- Maintain a **premium, sophisticated aesthetic** -- this is a leadership society, not a casual app
- Use **burgundy-to-black gradients** for key visual moments (headers, cards, hero sections)
- Gold accents should be used **sparingly** for emphasis -- icons, borders, highlights, CTAs
- Dark mode must feel equally polished, swapping gold for orange accent
- All interactive elements need clear hover/focus/active states
- Maintain generous whitespace -- avoid cramped layouts

### Icons

- Use **Lucide React** as the primary icon set
- Do NOT mix icon libraries (no mixing Lucide + Heroicons + FontAwesome)
- Custom SVGs must use `24x24` viewBox, `2px` stroke width, and `currentColor` for theming

### Tailwind

- Custom design tokens (shadows, gradients, animations) are defined in `tailwind.config.ts`
- Breakpoints: `xs: 320px`, `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1400px`
- Use Tailwind classes and CSS variables -- never inline styles for brand colors

## Data Architecture

### Current Backend: Supabase (active data store)

- **Future Backend**: Xano (migration planned but NOT yet in progress)
- The full database schema is documented in `docs/DATA_DICTIONARY.md`

### CRITICAL: Xano Migration Readiness

The backend will eventually migrate to Xano. All code must follow these patterns to make migration feasible:

1. **Abstract all data access through hooks** -- never call Supabase directly in components. Every fetch, mutation, and subscription goes through a dedicated hook (e.g., `useConferences()`, `useAttendees()`, `useRegistrations()`).
2. **Keep business logic out of components** -- components handle UI rendering only. Business logic (validation, transformation, calculations) belongs in utility functions or service modules.
3. **Use TypeScript interfaces for all data models** -- define explicit types for every database entity in `/types` or `/integrations/supabase/types.ts`.
4. **No Supabase-specific patterns in component code** -- no `.from('table').select()` in components. No Supabase realtime subscriptions directly in components. No Supabase auth calls outside the auth service layer.
5. **Use React Query for all server state** -- consistent query keys, proper cache invalidation, optimistic updates where appropriate.
6. **Design API responses as clean, flat objects** -- avoid deeply nested Supabase joins that would be hard to replicate. If you need related data, make separate queries and combine in the hook.
7. **Document Edge Function logic portably** -- each edge function's purpose, inputs/outputs, and Supabase-specific dependencies should be clear.

### Registration & Attendance Model (CRITICAL business logic)

The business model separates **billing** from **attendance**:

- **Registrations** are purchased by **Advisors** on behalf of universities or organizations (group purchases)
- **Attendees** are individual participants who later link their accounts when accessing the mobile app
- A single Registration can cover multiple Attendees
- Never conflate Registrations with Attendees -- they are distinct entities with different lifecycles

### Key Entities

- **Users / Profiles**: Authentication and profile data
- **Organizations**: Universities, companies, groups
- **Advisors**: Users who purchase registrations on behalf of organizations
- **Registrations**: Billing records tied to advisors/organizations (group purchases)
- **Attendees / Participants**: Individual people attending events (linked to registrations)
- **Conferences / Events**: Top-level event containers
- **Sessions / Agenda Items**: Individual talks, workshops, panels within a conference
- **Speakers**: Presenters at sessions
- **Tracks**: Thematic groupings of sessions
- **Video Content / Courses**: LMS content with Mux-hosted videos
- **Posts / Feed Items**: Social/community content
- **Check-ins**: QR code scan records for event attendance

## Performance Guidelines

- **Avoid N+1 queries** -- batch data fetching, use proper joins or parallel queries
- **Use denormalized counters** where appropriate (e.g., attendee count on a session) to avoid expensive COUNT queries
- **Paginate large lists** -- never fetch unbounded lists of attendees, sessions, or posts
- **Loading states**: Use skeleton screens, not spinners, for content areas
- **Cache with React Query** -- set appropriate `staleTime` and `cacheTime` values
- **Avoid duplicate API calls** -- audit components to ensure the same data isn't fetched multiple times on a single page

## Responsive Design

- The platform must work on **desktop, tablet, and mobile**
- Conference attendees primarily use the **mobile experience** during events (QR scanning, agenda, networking)
- Admin/advisor functions are primarily **desktop-focused** but must be usable on tablet
- Bottom navigation bar on mobile uses the Lucide icon set
- Test all features at: `375px` (mobile), `768px` (tablet), `1024px+` (desktop)

## Code Quality Standards

### TypeScript

- **Strict typing preferred** -- avoid `any` types unless absolutely unavoidable (and document why)
- Define **explicit interfaces** for all props, API responses, and data models
- Use **discriminated unions** for state management (`loading | error | success` patterns)
- Note: `tsconfig.app.json` currently has `strict: false` and `noImplicitAny: false` -- this is legacy, still prefer strict typing in new code

### React Patterns

- **Functional components only** -- no class components
- **Custom hooks** for all data fetching and complex state logic
- **Error boundaries** around major page sections
- **Memoization** (`useMemo`, `useCallback`) only when there's a measurable performance need -- don't prematurely optimize
- Keep components **focused and small** -- split components exceeding ~150 lines

### Error Handling

- Every data fetch must have **error handling** -- no unhandled promise rejections
- User-facing errors must be **friendly and actionable** (e.g., "Something went wrong loading sessions. Please try again." -- not raw error messages)
- Log errors to console in development with full context
- Use **Sonner toast notifications** for transient errors and operation confirmations

### File Organization Rules

- `/components` -- reusable UI components organized by feature domain
- `/components/ui` -- base design system components (shadcn/ui)
- `/pages` -- route-level page components only
- `/hooks` -- custom React hooks (data fetching, business logic)
- `/types` -- TypeScript interfaces and type definitions
- `/utils` -- pure utility functions
- `/lib` -- third-party library configurations, wrappers, and utility generators
- `/integrations` -- external service clients (Supabase, etc.)
- `/contexts` -- React Context providers

## PDF Generation

- Use **jsPDF** -- already integrated for client-side, zero-cost PDF creation (name badges, session flyers)
- All PDFs must follow Circle of Change brand guidelines (gradients, gold accents, correct fonts)
- PDF templates should handle variable content gracefully -- adaptive layouts for varying speaker counts, long titles, etc.
- Define PDF template logic in **dedicated utility/generator files** in `/lib`, not inline in components
- Include proper TypeScript interfaces for all PDF template data inputs

## Integrations

### Mux (Video)

- All video content is hosted on Mux
- Use `@mux/mux-player-react` for playback
- Handle video states: loading, playing, error, completed
- Track video progress for LMS completion

### QR Codes

- `qrcode.react` for code generation, `html5-qrcode` for scanning
- Must generate scannable codes at appropriate sizes
- Handle scan results with proper validation and feedback

## Things to AVOID

1. **Do NOT start migrating to Xano** -- keep building on Supabase, but follow the abstraction patterns above
2. **Do NOT introduce new icon libraries** -- use Lucide React or existing custom SVGs
3. **Do NOT use inline styles for brand colors** -- use CSS variables or Tailwind classes
4. **Do NOT fetch data directly in components** -- always go through hooks/services
5. **Do NOT skip TypeScript types** -- every new function, component, and data structure needs proper typing
6. **Do NOT create components that only work at one breakpoint** -- everything must be responsive
7. **Do NOT hardcode text strings that should be configurable** -- conference names, dates, society info should come from data, not be baked into components
8. **Do NOT ignore loading and error states** -- every async operation needs both
9. **Do NOT use `console.log` for user-facing error handling** -- use Sonner toast notifications and error UI
10. **Do NOT make breaking changes to the Registration <-> Attendee relationship** -- this is a core business model distinction

## New Feature Checklist

When building any new feature, follow this checklist:

1. Define **TypeScript interfaces** for any new data models
2. Create **custom hooks** for data access (not direct Supabase calls in components)
3. Implement **loading, error, and empty states**
4. Follow the **brand design system** (colors, typography, spacing)
5. Ensure **responsive design** across mobile, tablet, and desktop
6. Add **proper error handling** with user-friendly messages
7. Keep the **Xano migration in mind** -- abstract data access, avoid Supabase-specific patterns in UI code
8. Test with **realistic data volumes** -- not just 3 items, but 50-100+ where applicable
