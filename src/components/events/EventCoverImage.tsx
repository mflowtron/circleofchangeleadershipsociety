import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCoverImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  variant?: 'img' | 'background';
  fallbackClassName?: string;
}

export function EventCoverImage({
  src,
  alt,
  className,
  variant = 'img',
  fallbackClassName,
}: EventCoverImageProps) {
  const [hasError, setHasError] = useState(false);

  const showFallback = !src || hasError;

  if (showFallback) {
    if (variant === 'background') {
      return (
        <div 
          className={cn(
            "bg-gradient-to-br from-secondary to-secondary/80",
            className
          )}
          role="img"
          aria-label={alt}
        />
      );
    }

    return (
      <div 
        className={cn(
          "w-full h-full bg-muted flex items-center justify-center",
          fallbackClassName || className
        )}
        role="img"
        aria-label={alt}
      >
        <Calendar className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  if (variant === 'background') {
    return (
      <>
        {/* Hidden img to detect load errors */}
        <img
          src={src}
          alt=""
          className="sr-only"
          onError={() => setHasError(true)}
        />
        <div
          className={cn("bg-cover bg-center", className)}
          style={{ backgroundImage: `url(${src})` }}
          role="img"
          aria-label={alt}
        />
      </>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
