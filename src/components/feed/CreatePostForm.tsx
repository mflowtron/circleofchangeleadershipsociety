import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

interface CreatePostFormProps {
  onSubmit: (content: string, isGlobal: boolean) => Promise<void>;
  hasChapter: boolean;
}

export default function CreatePostForm({ onSubmit, hasChapter }: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    await onSubmit(content, isGlobal);
    setContent('');
    setLoading(false);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind? Share with your community..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <div className="flex items-center justify-between">
            {hasChapter && (
              <div className="flex items-center gap-2">
                <Switch
                  id="share-scope"
                  checked={isGlobal}
                  onCheckedChange={setIsGlobal}
                />
                <Label htmlFor="share-scope" className="text-sm text-muted-foreground">
                  {isGlobal ? 'Share with everyone' : 'Share with my chapter only'}
                </Label>
              </div>
            )}
            <Button type="submit" disabled={!content.trim() || loading} className="ml-auto">
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
