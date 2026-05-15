import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Announcement } from '@/hooks/useAnnouncements';

interface EditAnnouncementDialogProps {
  announcement: Announcement | null;
  onClose: () => void;
  onSave: (id: string, data: {
    title: string;
    content: string;
    is_active: boolean;
    expires_at: string | null;
  }) => Promise<void>;
}

export default function EditAnnouncementDialog({
  announcement,
  onClose,
  onSave,
}: EditAnnouncementDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
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

    setIsSubmitting(true);
    await onSave(announcement.id, {
      title: title.trim(),
      content: content.trim(),
      is_active: isActive,
      expires_at: expiresAt || null,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={!!announcement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
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
              rows={3}
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="edit-expires">Expires At (optional)</Label>
              <Input
                id="edit-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="edit-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
