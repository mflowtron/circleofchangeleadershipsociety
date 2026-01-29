
# LinkedIn Profile Linking Implementation

## Overview
Add the ability for users to link their LinkedIn profile to their account. The LinkedIn URL will be displayed only on the Profile page with a clickable button/link.

## Implementation Steps

### 1. Database Migration
Add a `linkedin_url` column to the `profiles` table:
- Column type: `text`, nullable
- No additional RLS changes needed (existing profile policies allow users to update their own profile)

```sql
ALTER TABLE public.profiles 
ADD COLUMN linkedin_url text;
```

### 2. Update Profile Page UI
Modify `src/pages/Profile.tsx` to add:

**Display Section (Profile Header Card):**
- Show a LinkedIn icon/button next to the user's info when they have a LinkedIn URL set
- Button opens their LinkedIn profile in a new tab

**Edit Section (Edit Profile Card):**
- Add a new input field for LinkedIn Profile URL
- Include placeholder text showing the expected format
- Add the Linkedin icon from lucide-react

### 3. Client-Side Validation
Implement basic URL format validation:
- Must be a valid URL starting with `https://linkedin.com/in/` or `https://www.linkedin.com/in/`
- Also accept `linkedin.com/in/` without https (auto-prefix it)
- Show inline error message if format is invalid
- Prevent form submission if validation fails

### 4. Update AuthContext Types
Update the profile type in `src/contexts/AuthContext.tsx` to include the new `linkedin_url` field so it's available throughout the app.

---

## Technical Details

### Files to Modify
1. **Database Migration** - Add `linkedin_url` column to profiles table
2. **`src/pages/Profile.tsx`** - Add LinkedIn input field with validation and display
3. **`src/contexts/AuthContext.tsx`** - Add `linkedin_url` to profile type

### Validation Logic
```typescript
const isValidLinkedInUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  const pattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
  return pattern.test(url);
};
```

### UI Components
- Use `lucide-react`'s `Linkedin` icon
- Input field with validation error state
- Clickable LinkedIn button in profile header when URL is set
