import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface EventAnnouncementRecord {
  id: string;
  event_id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  push_notification_id: string | null;
  audience_type: string;
  audience_filter: Record<string, unknown> | null;
}

interface EditEventAnnouncementDialogProps {
  announcement: EventAnnouncementRecord | null;
  onClose: () => void;
  onSave: (id: string, data: {
    title: string;
    content: string;
    priority: string;
    is_active: boolean;
    expires_at: string | null;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export default function EditEventAnnouncementDialog({
  announcement,
  onClose,
  onSave,
  isSubmitting,
}: EditEventAnnouncementDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
      setPriority(announcement.priority as 'normal' | 'urgent');
      setIsActive(announcement.is_active);
      setExpiresAt(
        announcement.expires_at
          ? new Date(announcement.expires_at).toISOString().slice(0, 16)
          : ''
      );
    }
  }, [announcement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement || !title.trim() || !content.trim()) return;

    await onSave(announcement.id, {
      title: title.trim(),
      content: content.trim(),
      priority,
      is_active: isActive,
      expires_at: expiresAt || null,
    });
  };

  return (
    <Dialog open={!!announcement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">Content</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'normal' | 'urgent')}>
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-expires">Expires At (optional)</Label>
              <Input
                id="edit-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="edit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="edit-active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
