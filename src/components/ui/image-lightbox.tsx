import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function ImageLightbox({ src, alt = '', className }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in transition-opacity hover:opacity-90 ${className}`}
        onClick={() => setIsOpen(true)}
      />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none">
          <div className="relative flex items-center justify-center">
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={() => setIsOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
