import { useRef } from 'react';
import { Paperclip, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE } from '@/lib/fileUtils';
import { toast } from 'sonner';

interface AttachmentPickerProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export function AttachmentPicker({ onSelect, disabled }: AttachmentPickerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB'
      });
      return;
    }

    // Validate file type
    const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: type === 'image' 
          ? 'Please select a JPEG, PNG, GIF, or WebP image' 
          : 'File type not supported'
      });
      return;
    }

    onSelect(file);
    
    // Reset input
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={(e) => handleFileChange(e, 'image')}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(',')}
        onChange={(e) => handleFileChange(e, 'file')}
        className="hidden"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-11 w-11 shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Image className="h-4 w-4 mr-2" />
            Photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
