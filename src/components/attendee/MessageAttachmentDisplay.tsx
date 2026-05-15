import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import ImageLightbox from '@/components/ui/image-lightbox';
import { formatBytes, isImageType, getFileIcon } from '@/lib/fileUtils';
import { cn } from '@/lib/utils';

interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface MessageAttachmentDisplayProps {
  attachment: MessageAttachment;
  isOwn: boolean;
}

export function MessageAttachmentDisplay({ attachment, isOwn }: MessageAttachmentDisplayProps) {
  const isImage = isImageType(attachment.type);

  if (isImage) {
    return (
      <div className="mb-1">
        <ImageLightbox
          src={attachment.url}
          alt={attachment.name}
          className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer"
        />
      </div>
    );
  }

  const FileIcon = (() => {
    const iconType = getFileIcon(attachment.type);
    switch (iconType) {
      case 'pdf':
      case 'doc':
        return FileText;
      case 'spreadsheet':
        return FileSpreadsheet;
      default:
        return File;
    }
  })();

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className={cn(
        "flex items-center gap-2 rounded-lg p-2 mb-1 transition-colors",
        isOwn 
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
          : "bg-background/50 hover:bg-background/80"
      )}
    >
      <FileIcon className={cn(
        "h-8 w-8 shrink-0",
        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isOwn ? "text-primary-foreground" : "text-foreground"
        )}>
          {attachment.name}
        </p>
        <p className={cn(
          "text-xs",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {formatBytes(attachment.size)}
        </p>
      </div>
      <Download className={cn(
        "h-4 w-4 shrink-0",
        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
      )} />
    </a>
  );
}
