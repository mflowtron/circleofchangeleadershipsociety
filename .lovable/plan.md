

# Add Photo and File Sharing to Chat Messages

## Overview

Extend the messaging system to support sharing photos and files in chat conversations. This will allow attendees to share images, PDFs, and other documents within their conversations.

---

## User Experience

### Sending Attachments
- Tap the attachment button (paperclip/plus icon) next to the message input
- Choose from: "Photo" (camera/gallery) or "File" (document picker)
- Selected file shows as a preview above the input
- Send button uploads file then sends message with attachment URL
- Optimistic preview shows immediately while uploading

### Viewing Attachments
- **Images**: Display inline with thumbnail, tap to open fullscreen lightbox (existing component)
- **Files**: Show file card with icon, name, size - tap to download/open
- Files appear alongside any text content in the same bubble

### Visual Design
```text
SENDING IMAGE                        RECEIVED FILE
┌───────────────────────┐           ┌───────────────────────┐
│  ┌─────────────────┐  │           │  John Smith           │
│  │                 │  │           │  ┌─────────────────┐  │
│  │   [Photo]       │  │           │  │ 📄 document.pdf │  │
│  │   Loading...    │  │           │  │    2.4 MB       │  │
│  └─────────────────┘  │           │  └─────────────────┘  │
│  Optional caption...  │           │  Here's the agenda    │
└───────────────────────┘           └───────────────────────┘
```

---

## Database Changes

### Extend `attendee_messages` Table

Add new columns for attachment data:

| Column | Type | Description |
|--------|------|-------------|
| `attachment_url` | text | Public URL to the uploaded file |
| `attachment_type` | text | MIME type (e.g., 'image/jpeg', 'application/pdf') |
| `attachment_name` | text | Original filename |
| `attachment_size` | integer | File size in bytes |

### Create Storage Bucket

Create a new `chat-attachments` bucket for storing shared files:
- Public access for easy URL sharing
- Organized by: `{conversation_id}/{message_id}/{filename}`

### Storage RLS Policies

Allow uploads for authenticated conversation participants and public read access.

---

## Implementation Details

### 1. Database Migration

```sql
-- Add attachment columns to attendee_messages
ALTER TABLE public.attendee_messages
ADD COLUMN attachment_url text,
ADD COLUMN attachment_type text,
ADD COLUMN attachment_name text,
ADD COLUMN attachment_size integer;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- Allow service role full access (uploads happen via edge function)
-- Public read access for viewing attachments
CREATE POLICY "Public read access for chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
```

### 2. Edge Function: Update `send-attendee-message`

Modify to accept optional attachment data:

```typescript
// New input parameters:
// attachment_url?: string
// attachment_type?: string  
// attachment_name?: string
// attachment_size?: number

// Insert with attachment fields
const { data: message, error: messageError } = await supabase
  .from('attendee_messages')
  .insert({
    conversation_id,
    sender_attendee_id: attendee_id,
    content: content?.trim() || '',  // Content now optional if attachment exists
    reply_to_id: reply_to_id || null,
    attachment_url,
    attachment_type,
    attachment_name,
    attachment_size
  })
  .select()
  .single();
```

### 3. Edge Function: Create `upload-chat-attachment`

New function to handle file uploads securely:

```typescript
// Input: { email, session_token, attendee_id, conversation_id, file (base64), filename, content_type }
// 1. Validate session
// 2. Verify attendee is participant
// 3. Validate file type/size (max 10MB, allowed types)
// 4. Upload to storage bucket
// 5. Return public URL
```

### 4. Frontend: Update Message Interface

```typescript
export interface MessageAttachment {
  url: string;
  type: string;        // MIME type
  name: string;        // Original filename
  size: number;        // Bytes
}

export interface Message {
  // ... existing fields
  attachment?: MessageAttachment;
}
```

### 5. Frontend: Create `AttachmentPicker` Component

Button/menu to select photos or files:

```tsx
function AttachmentPicker({ onSelect, disabled }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Paperclip className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => openPicker('image')}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Photo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openPicker('file')}>
          <FileIcon className="h-4 w-4 mr-2" />
          File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 6. Frontend: Create `AttachmentPreview` Component

Shows selected file before sending with remove button:

```tsx
function AttachmentPreview({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  
  return (
    <div className="relative inline-block">
      {isImage ? (
        <img src={URL.createObjectURL(file)} className="h-24 rounded-lg" />
      ) : (
        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <FileIcon className="h-8 w-8" />
          <div>
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>
      )}
      <Button size="icon" variant="destructive" className="absolute -top-2 -right-2" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

### 7. Frontend: Create `MessageAttachment` Component

Displays attachment within message bubble:

```tsx
function MessageAttachmentDisplay({ attachment, isOwn }) {
  const isImage = attachment.type.startsWith('image/');
  
  if (isImage) {
    return (
      <ImageLightbox 
        src={attachment.url}
        alt={attachment.name}
        className="max-w-full rounded-lg max-h-64 object-cover"
      />
    );
  }
  
  // File preview
  return (
    <a 
      href={attachment.url}
      target="_blank"
      className="flex items-center gap-2 bg-background/50 rounded-lg p-2"
    >
      <FileIcon type={attachment.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
      </div>
      <Download className="h-4 w-4" />
    </a>
  );
}
```

### 8. Update `MessageInput` Component

Add attachment button and preview:

```tsx
function MessageInput({ onSend, onSendWithAttachment, disabled }) {
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleSend = async () => {
    if (attachment) {
      setUploading(true);
      await onSendWithAttachment(message, attachment);
      setAttachment(null);
      setUploading(false);
    } else {
      await onSend(message);
    }
  };
  
  return (
    <div className="border-t p-4">
      {/* Attachment preview */}
      {attachment && (
        <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />
      )}
      
      <div className="flex items-end gap-2">
        <AttachmentPicker 
          onSelect={setAttachment} 
          disabled={disabled || uploading || !!attachment}
        />
        <Textarea ... />
        <Button onClick={handleSend} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}
```

### 9. Update `MessageBubble` Component

Render attachment if present:

```tsx
<div className="bg-muted rounded-2xl px-4 py-2">
  {/* Attachment first */}
  {message.attachment && (
    <MessageAttachmentDisplay 
      attachment={message.attachment} 
      isOwn={message.is_own}
    />
  )}
  
  {/* Text content */}
  {message.content && (
    <p className="text-sm whitespace-pre-wrap break-words mt-2">
      {message.content}
    </p>
  )}
</div>
```

### 10. Update `useMessages` Hook

Add attachment upload and send logic:

```typescript
const sendMessageWithAttachment = useCallback(async (content: string, file: File) => {
  // 1. Upload file to storage via edge function
  const uploadResult = await supabase.functions.invoke('upload-chat-attachment', {
    body: {
      email, session_token, attendee_id, conversation_id,
      file: await fileToBase64(file),
      filename: file.name,
      content_type: file.type
    }
  });
  
  if (uploadResult.error) throw uploadResult.error;
  
  // 2. Send message with attachment metadata
  const { data } = await supabase.functions.invoke('send-attendee-message', {
    body: {
      email, session_token, attendee_id, conversation_id, content,
      attachment_url: uploadResult.data.url,
      attachment_type: file.type,
      attachment_name: file.name,
      attachment_size: file.size
    }
  });
  
  return { success: true };
}, [...]);
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_message_attachments.sql` | Create | Add columns and storage bucket |
| `supabase/functions/upload-chat-attachment/index.ts` | Create | Handle file upload to storage |
| `supabase/functions/send-attendee-message/index.ts` | Modify | Accept attachment metadata |
| `supabase/functions/get-conversation-messages/index.ts` | Modify | Include attachment fields in response |
| `src/hooks/useMessages.ts` | Modify | Add attachment interface and upload logic |
| `src/components/attendee/MessageInput.tsx` | Modify | Add attachment picker and preview |
| `src/components/attendee/MessageBubble.tsx` | Modify | Display attachments in bubbles |
| `src/components/attendee/AttachmentPicker.tsx` | Create | Dropdown menu for selecting files |
| `src/components/attendee/AttachmentPreview.tsx` | Create | Preview before sending |
| `src/components/attendee/MessageAttachmentDisplay.tsx` | Create | Display attachment in message |
| `src/lib/fileUtils.ts` | Create | Helper functions (formatBytes, fileToBase64) |

---

## Technical Considerations

### File Limits
- Maximum file size: 10MB
- Allowed image types: JPEG, PNG, GIF, WebP
- Allowed file types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT

### Optimistic UI
- Show blurred/placeholder while uploading
- Progress indicator for large files
- Retry option on upload failure

### Security
- Uploads validated via edge function (session check)
- File type validation on both client and server
- Storage bucket with proper RLS policies

### Performance
- Images compressed before upload (max 2000px width)
- Thumbnail generation for previews
- Lazy loading for images in message list

