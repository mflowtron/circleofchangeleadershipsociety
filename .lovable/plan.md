

# Fix: Add Storage Policies for `recording-resources` Bucket

## Problem
The `recording-resources` storage bucket has no RLS policies for INSERT/UPDATE/DELETE on `storage.objects`. Uploads fail with "new row violates row-level security policy" even for admins.

## Solution
Add storage policies via a database migration that allow admins and advisors to upload, update, and delete files in the `recording-resources` bucket. Authenticated users should be able to read (SELECT is already handled by the bucket being public, but we add it for completeness).

### Database Migration

```sql
-- Allow admins/advisors to upload resources
CREATE POLICY "Admins advisors upload recording resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recording-resources'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'advisor')
  )
);

-- Allow admins/advisors to update resources
CREATE POLICY "Admins advisors update recording resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recording-resources'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'advisor')
  )
);

-- Allow admins/advisors to delete resources
CREATE POLICY "Admins advisors delete recording resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recording-resources'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'advisor')
  )
);

-- Allow authenticated users to read resources
CREATE POLICY "Authenticated read recording resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recording-resources');
```

No frontend code changes needed — the upload logic in `useRecordingResources.ts` is correct; it's just blocked by missing storage policies.

