import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ImagePlus, Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUploadAlbumPhotos, type PendingUpload } from '@/hooks/useAlbumPhotos';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 20;

export function AlbumUploadDialog({ open, onOpenChange }: Props) {
  const [items, setItems] = useState<PendingUpload[]>([]);
  const [batchCaption, setBatchCaption] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAlbumPhotos();
  const isUploading = upload.isPending;

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const accepted: PendingUpload[] = [];
    for (const file of arr) {
      if (items.length + accepted.length >= MAX_FILES) {
        toast.error(`You can upload up to ${MAX_FILES} photos at a time`);
        break;
      }
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 25MB`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        caption: '',
        progress: 0,
        status: 'queued',
      });
    }
    if (accepted.length) setItems((prev) => [...prev, ...accepted]);
  };

  const updateItem = (id: string, update: Partial<PendingUpload>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...update } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClose = (next: boolean) => {
    if (isUploading) return;
    if (!next) {
      setItems([]);
      setBatchCaption('');
    }
    onOpenChange(next);
  };

  const handleUpload = async () => {
    if (items.length === 0) return;
    const prepared = items.map((i) => ({
      ...i,
      caption: i.caption || batchCaption,
    }));
    setItems(prepared);
    const result = await upload.mutateAsync({
      uploads: prepared,
      onProgress: updateItem,
    });
    if (result.succeeded === result.total) {
      handleClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add to Shared Album</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div
            onClick={() => !isUploading && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isUploading) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!isUploading) addFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Drop photos here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WebP, GIF, HEIC · up to 25MB each · max {MAX_FILES} at a time
            </p>
          </div>

          {items.length > 0 && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Caption (optional, applied to all)
                </label>
                <Textarea
                  value={batchCaption}
                  onChange={(e) => setBatchCaption(e.target.value.slice(0, 500))}
                  placeholder="Add a caption everyone will see…"
                  disabled={isUploading}
                  className="resize-none"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">{batchCaption.length}/500</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item) => {
                  const url = URL.createObjectURL(item.file);
                  return (
                    <div
                      key={item.id}
                      className="relative rounded-lg overflow-hidden bg-muted aspect-square group"
                    >
                      <img
                        src={url}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                        onLoad={() => URL.revokeObjectURL(url)}
                      />
                      {item.status === 'queued' && !isUploading && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute top-1.5 right-1.5 bg-background/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {item.status === 'uploading' && (
                        <div className="absolute inset-x-0 bottom-0 bg-background/90 p-2 space-y-1">
                          <Progress value={item.progress} className="h-1" />
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                          </p>
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="absolute inset-x-0 bottom-0 bg-destructive/90 text-destructive-foreground p-1.5 text-[10px] flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {item.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isUploading}>
            {isUploading ? 'Uploading…' : 'Cancel'}
          </Button>
          <Button onClick={handleUpload} disabled={items.length === 0 || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {items.length > 0 ? `(${items.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
