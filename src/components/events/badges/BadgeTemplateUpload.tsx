import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeTemplateUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
}

export function BadgeTemplateUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  isUploading = false,
}: BadgeTemplateUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  if (currentImageUrl) {
    return (
      <div className="relative">
        <div className="aspect-[3/4] w-full max-w-[200px] rounded-lg border overflow-hidden bg-muted">
          <img
            src={currentImageUrl}
            alt="Badge background"
            className="w-full h-full object-cover"
          />
        </div>
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
        dragActive ? 'border-primary bg-primary/5' : 'border-border',
        isUploading && 'opacity-50 pointer-events-none'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 rounded-full bg-muted">
          <Image className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Upload badge background</p>
          <p className="text-xs text-muted-foreground">
            Recommended: 3" × 4" (300 × 400px at 100dpi)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Choose File'}
        </Button>
      </div>
    </div>
  );
}
