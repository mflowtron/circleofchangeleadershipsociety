import { useMemo } from 'react';
import { X, FileText, FileSpreadsheet, FileImage, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes, isImageType, getFileIcon } from '@/lib/fileUtils';

interface AttachmentPreviewProps {
  file: File;
  onRemove: () => void;
  uploading?: boolean;
}

export function AttachmentPreview({ file, onRemove, uploading }: AttachmentPreviewProps) {
  const isImage = isImageType(file.type);
  const previewUrl = useMemo(() => 
    isImage ? URL.createObjectURL(file) : null,
    [file, isImage]
  );

  const FileIcon = useMemo(() => {
    const iconType = getFileIcon(file.type);
    switch (iconType) {
      case 'pdf':
      case 'doc':
        return FileText;
      case 'spreadsheet':
        return FileSpreadsheet;
      case 'image':
        return FileImage;
      default:
        return File;
    }
  }, [file.type]);

  return (
    <div className="relative inline-block mb-2">
      {isImage && previewUrl ? (
        <div className="relative">
          <img 
            src={previewUrl} 
            alt={file.name}
            className="h-24 max-w-48 rounded-lg object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-muted rounded-lg p-3 pr-10">
          <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-32">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          {uploading && (
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>
      )}
      
      {!uploading && (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
