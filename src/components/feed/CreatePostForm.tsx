import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, ImagePlus, X, Globe, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CreatePostFormProps {
  onSubmit: (content: string, isGlobal: boolean, imageFile?: File) => Promise<void>;
  hasChapter: boolean;
}

export default function CreatePostForm({ onSubmit, hasChapter }: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    await onSubmit(content, isGlobal, imageFile || undefined);
    setContent('');
    removeImage();
    setLoading(false);
  };

  return (
    <Card className="shadow-soft border-border/50 overflow-hidden">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/10 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="What's on your mind? Share with your community..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none bg-muted/30 border-border/50 focus:border-primary rounded-xl"
            />
          </div>
          
          {imagePreview && (
            <div className="relative inline-block ml-13">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-48 rounded-xl object-cover shadow-soft"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-medium"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Photo
              </Button>
              
              {hasChapter && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  {isGlobal ? (
                    <Globe className="h-4 w-4 text-primary" />
                  ) : (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    id="share-scope"
                    checked={isGlobal}
                    onCheckedChange={setIsGlobal}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="share-scope" className="text-xs text-muted-foreground cursor-pointer">
                    {isGlobal ? 'Everyone' : 'Chapter only'}
                  </Label>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={!content.trim() || loading}
              className="btn-gold-glow rounded-xl px-6"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
