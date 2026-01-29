import { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const ImageLightbox = forwardRef<HTMLImageElement, ImageLightboxProps>(
  function ImageLightbox({ src, alt = '', className }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
    const [showControls, setShowControls] = useState(true);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    const imageRef = useRef<HTMLDivElement>(null);
    const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
    const lastDistanceRef = useRef<number | null>(null);
    const initialTransformRef = useRef<Transform>({ scale: 1, translateX: 0, translateY: 0 });
    const velocityRef = useRef({ x: 0, y: 0 });
    const lastMoveTimeRef = useRef(0);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTransform = useCallback(() => {
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      setDragOffset({ x: 0, y: 0 });
    }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      resetTransform();
      setShowControls(true);
    }, 250);
  }, [resetTransform]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the container, not the image
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

    // Auto-hide controls after 3 seconds
    const resetControlsTimeout = useCallback(() => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (transform.scale <= 1) {
          setShowControls(false);
        }
      }, 3000);
    }, [transform.scale]);

    // Toggle controls on tap
    const handleTap = useCallback(() => {
      if (transform.scale <= 1) {
        setShowControls(prev => !prev);
        if (!showControls) {
          resetControlsTimeout();
        }
      }
    }, [transform.scale, showControls, resetControlsTimeout]);

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
      resetControlsTimeout();
    }, [resetControlsTimeout]);

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
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        velocityRef.current = { x: 0, y: 0 };
        lastMoveTimeRef.current = Date.now();
        setIsDragging(true);
      } else if (e.touches.length === 2) {
        lastDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
        lastTouchRef.current = getCenter(e.touches[0], e.touches[1]);
      }
      initialTransformRef.current = { ...transform };
    }, [transform]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      
      const now = Date.now();
      const timeDelta = now - lastMoveTimeRef.current;
      
      if (e.touches.length === 2 && lastDistanceRef.current !== null) {
        // Pinch to zoom
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / lastDistanceRef.current;
        const newScale = Math.max(1, Math.min(initialTransformRef.current.scale * scale, 5));
        
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
        setDragOffset({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && lastTouchRef.current) {
        const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
        const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
        
        // Calculate velocity for momentum
        if (timeDelta > 0) {
          velocityRef.current = {
            x: deltaX / timeDelta,
            y: deltaY / timeDelta,
          };
        }
        lastMoveTimeRef.current = now;
        
        if (transform.scale > 1) {
          // Pan when zoomed
          setTransform(prev => ({
            ...prev,
            translateX: initialTransformRef.current.translateX + deltaX,
            translateY: initialTransformRef.current.translateY + deltaY,
          }));
        } else {
          // Swipe to dismiss when not zoomed - Apple Photos style
          setDragOffset({ x: deltaX, y: deltaY });
        }
      }
    }, [transform.scale]);

    const handleTouchEnd = useCallback(() => {
      setIsDragging(false);
      
      // Check for swipe to dismiss
      if (transform.scale <= 1 && (Math.abs(dragOffset.y) > 100 || Math.abs(velocityRef.current.y) > 0.5)) {
        handleClose();
      } else {
        // Spring back
        setDragOffset({ x: 0, y: 0 });
      }
      
      // Snap back if zoomed out
      if (transform.scale < 1) {
        setTransform(prev => ({ ...prev, scale: 1 }));
      }
      
      lastTouchRef.current = null;
      lastDistanceRef.current = null;
    }, [transform.scale, dragOffset.y, handleClose]);

    // Handle double tap to zoom
    const lastTapRef = useRef<number>(0);
    const lastTapPosRef = useRef<{ x: number; y: number } | null>(null);
    
    const handleDoubleTap = useCallback((e: React.TouchEvent) => {
      const now = Date.now();
      const touch = e.changedTouches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      
      if (lastTapPosRef.current) {
        const distance = Math.sqrt(
          Math.pow(currentPos.x - lastTapPosRef.current.x, 2) +
          Math.pow(currentPos.y - lastTapPosRef.current.y, 2)
        );
        
        if (now - lastTapRef.current < 300 && distance < 50) {
          // Double tap detected
          e.preventDefault();
          if (transform.scale > 1) {
            resetTransform();
          } else {
            // Zoom to tap location
            const rect = imageRef.current?.getBoundingClientRect();
            if (rect) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const offsetX = (centerX - touch.clientX) * 1.5;
              const offsetY = (centerY - touch.clientY) * 1.5;
              setTransform({ scale: 2.5, translateX: offsetX, translateY: offsetY });
            } else {
              setTransform({ scale: 2.5, translateX: 0, translateY: 0 });
            }
          }
          lastTapRef.current = 0;
          lastTapPosRef.current = null;
          return;
        }
      }
      
      lastTapRef.current = now;
      lastTapPosRef.current = currentPos;
      
      // Single tap - toggle controls after a short delay
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 280) {
          handleTap();
        }
      }, 300);
    }, [transform.scale, resetTransform, handleTap]);

    // Reset transform when dialog closes
    useEffect(() => {
      if (!isOpen) {
        resetTransform();
      }
    }, [isOpen, resetTransform]);

    // Start controls timeout when opening
    useEffect(() => {
      if (isOpen) {
        resetControlsTimeout();
      }
      return () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }, [isOpen, resetControlsTimeout]);

    // Lock body scroll when open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Calculate background opacity based on drag
    const dragProgress = Math.min(1, Math.abs(dragOffset.y) / 300);
    const backgroundOpacity = 1 - dragProgress * 0.5;
    const imageScale = 1 - dragProgress * 0.1;

    const lightboxContent = (
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center",
          isClosing ? "animate-fade-out" : "animate-fade-in"
        )}
        style={{
          backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity * 0.95})`,
          transition: isDragging ? 'none' : 'background-color 0.2s ease-out',
        }}
      >
        {/* Close button - Apple style */}
        <button
          onClick={handleClose}
          className={cn(
            "absolute z-30 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          )}
          style={{ 
            top: 'max(1rem, env(safe-area-inset-top))',
            left: 'max(1rem, env(safe-area-inset-left))'
          }}
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Zoom indicator - subtle */}
        {transform.scale > 1 && (
          <div className={cn(
            "absolute z-30 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-medium text-white transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )} style={{ 
            top: 'max(1rem, env(safe-area-inset-top))',
            right: 'max(1rem, env(safe-area-inset-right))'
          }}>
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
          onClick={handleBackgroundClick}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `translate(${transform.translateX + dragOffset.x}px, ${transform.translateY + dragOffset.y}px) scale(${transform.scale * imageScale})`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform',
            }}
            onTouchEnd={handleDoubleTap}
            draggable={false}
          />
        </div>

        {/* Swipe hint - only show briefly on first open */}
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 z-20 text-white/60 text-xs font-medium transition-opacity duration-500 pointer-events-none",
          showControls ? "opacity-100" : "opacity-0"
        )} style={{ bottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          Swipe down to close
        </div>

      </div>
    );

    return (
      <>
        {/* Thumbnail */}
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={cn("cursor-zoom-in transition-opacity active:opacity-80", className)}
          onClick={() => setIsOpen(true)}
        />
        
        {/* Fullscreen Lightbox - rendered via portal to escape container constraints */}
        {isOpen && createPortal(lightboxContent, document.body)}
      </>
    );
  }
);

export default ImageLightbox;
