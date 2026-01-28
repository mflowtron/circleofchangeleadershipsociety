import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  className?: string;
}

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

export default function ImageLightbox({ src, alt = '', className }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistanceRef = useRef<number | null>(null);
  const initialTransformRef = useRef<Transform>({ scale: 1, translateX: 0, translateY: 0 });

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.5, 5) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 1),
      translateX: prev.scale <= 1.5 ? 0 : prev.translateX,
      translateY: prev.scale <= 1.5 ? 0 : prev.translateY,
    }));
  }, []);

  // Handle wheel zoom on desktop
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => {
      const newScale = Math.max(1, Math.min(prev.scale * delta, 5));
      return {
        ...prev,
        scale: newScale,
        translateX: newScale === 1 ? 0 : prev.translateX,
        translateY: newScale === 1 ? 0 : prev.translateY,
      };
    });
  }, []);

  // Get distance between two touch points
  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start pan
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      // Two fingers - start pinch
      lastDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      lastTouchRef.current = getCenter(e.touches[0], e.touches[1]);
    }
    initialTransformRef.current = { ...transform };
  }, [transform]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && lastDistanceRef.current !== null) {
      // Pinch to zoom
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / lastDistanceRef.current;
      const newScale = Math.max(1, Math.min(initialTransformRef.current.scale * scale, 5));
      
      // Also handle pan during pinch
      const currentCenter = getCenter(e.touches[0], e.touches[1]);
      if (lastTouchRef.current) {
        const deltaX = currentCenter.x - lastTouchRef.current.x;
        const deltaY = currentCenter.y - lastTouchRef.current.y;
        
        setTransform({
          scale: newScale,
          translateX: newScale > 1 ? initialTransformRef.current.translateX + deltaX : 0,
          translateY: newScale > 1 ? initialTransformRef.current.translateY + deltaY : 0,
        });
      }
    } else if (e.touches.length === 1 && lastTouchRef.current && transform.scale > 1) {
      // Single touch pan (only when zoomed)
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      setTransform(prev => ({
        ...prev,
        translateX: initialTransformRef.current.translateX + deltaX,
        translateY: initialTransformRef.current.translateY + deltaY,
      }));
    }
  }, [transform.scale]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    lastDistanceRef.current = null;
  }, []);

  // Handle double tap to zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (transform.scale > 1) {
        resetTransform();
      } else {
        setTransform({ scale: 2.5, translateX: 0, translateY: 0 });
      }
    }
    lastTapRef.current = now;
  }, [transform.scale, resetTransform]);

  // Reset transform when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetTransform();
    }
  }, [isOpen, resetTransform]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in transition-opacity hover:opacity-90 ${className}`}
        onClick={() => setIsOpen(true)}
      />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-foreground/90 shadow-none">
          {/* Controls */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={resetTransform}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom level indicator */}
          {transform.scale > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
              {Math.round(transform.scale * 100)}%
            </div>
          )}

          {/* Image container */}
          <div 
            ref={imageRef}
            className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
                transition: lastTouchRef.current ? 'none' : 'transform 0.2s ease-out',
              }}
              onTouchEnd={handleDoubleTap}
              draggable={false}
            />
          </div>

          {/* Instructions hint */}
          <div className="absolute bottom-4 right-4 z-20 text-xs text-background/60 hidden sm:block">
            Scroll to zoom • Drag to pan
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
