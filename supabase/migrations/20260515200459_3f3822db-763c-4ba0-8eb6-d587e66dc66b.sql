SET session_replication_role = 'replica';
DELETE FROM storage.objects WHERE bucket_id IN ('event-images','badge-templates','speaker-images','chat-attachments');
DELETE FROM storage.buckets WHERE id IN ('event-images','badge-templates','speaker-images','chat-attachments');
SET session_replication_role = 'origin';